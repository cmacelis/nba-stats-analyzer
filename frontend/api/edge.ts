/**
 * GET /api/edge?stat=pts&min_minutes=20&season=2025
 *
 * Returns a ranked list of active players ordered by |delta| between their
 * season average and their last-5-game average for the chosen stat.
 * Uses two batch API calls: one for season averages, one for recent game logs.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import {
  applyCors, BDL_BASE, buildNbaPhotoUrl, findNbaPersonId, BDL_SEASON,
  getTodaysGames, getAllTodaysProps, getBatchSeasonAverages,
  getPlayerIdsPlayingToday,
  type PlayerProp, type TodayGame,
} from './_lib.js';
import { AdapterFactory } from './_adapters/AdapterFactory.js';

const BDL_KEY = process.env.BALL_DONT_LIE_API_KEY;

// ── helpers ───────────────────────────────────────────────────────────────────

function parseMins(min: string | number): number {
  if (typeof min === 'number') return min;
  const parts = String(min || '0').split(':');
  return parseInt(parts[0]) + (parseInt(parts[1] || '0') / 60);
}

/** Build a BDL GET request URL supporting array params (player_ids[], seasons[]). */
async function bdlBatch(path: string, params: Record<string, string | number | (string | number)[]>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach(vi => sp.append(k, String(vi)));
    else sp.append(k, String(v));
  }
  const res = await axios.get(`${BDL_BASE}${path}?${sp.toString()}`, {
    headers: { Authorization: BDL_KEY },
    timeout: 15000,
  });
  return res.data;
}

// ── active player cache ───────────────────────────────────────────────────────

interface ActivePlayer {
  id: number;
  first_name: string;
  last_name: string;
  team?: { id: number; full_name: string; abbreviation: string };
}

let _playerCache: { data: ActivePlayer[]; ts: number } | null = null;
const PLAYER_TTL = 4 * 60 * 60 * 1000; // 4 hours (was 24h — too stale)

async function getActivePlayers(): Promise<ActivePlayer[]> {
  const now = Date.now();
  if (_playerCache && now - _playerCache.ts < PLAYER_TTL) return _playerCache.data;

  // Paginate through ALL active players via BDL cursor (524 players ÷ 100/page ≈ 6 pages)
  const all: ActivePlayer[] = [];
  let cursor: number | null = null;
  for (let page = 0; page < 8; page++) {
    const params: Record<string, string | number> = { per_page: 100 };
    if (cursor) params.cursor = cursor;
    const raw = await bdlBatch('/players/active', params);
    const data: ActivePlayer[] = raw?.data ?? [];
    all.push(...data);
    cursor = raw?.meta?.next_cursor ?? null;
    if (!cursor || data.length === 0) break;
  }

  console.log(`[edge] fetched ${all.length} active players`);
  _playerCache = { data: all, ts: Date.now() };
  return all;
}

// ── stat helpers ──────────────────────────────────────────────────────────────

export type StatKey = 'pts' | 'pra';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function gameVal(game: any, stat: StatKey): number {
  if (stat === 'pra') return (Number(game.pts) || 0) + (Number(game.reb) || 0) + (Number(game.ast) || 0);
  return Number(game.pts) || 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function seasonVal(avg: any, stat: StatKey): number | null {
  if (!avg) return null;
  const v = stat === 'pra'
    ? (Number(avg.pts) || 0) + (Number(avg.reb) || 0) + (Number(avg.ast) || 0)
    : Number(avg.pts) || 0;
  return v > 0 ? v : null;
}

// ── response shape ────────────────────────────────────────────────────────────

export interface EdgeEntry {
  player_id: number;
  player_name: string;
  team: string;
  team_abbrev: string;
  photo_url: string | null;
  season_avg: number;
  recent_avg: number;
  delta: number;
  last5: number[];
  games_played: number;
  prop_line?:      number | null;
  line_source?:    string | null;
  over_odds?:      number | null;
  under_odds?:     number | null;
  has_game_today?: boolean;
}

interface UpstreamError {
  status:       number | null;
  message:      string;
  url:          string;
  body_preview: string | null;
}

export interface EdgeDebugInfo {
  active_players_count: number;
  active_player_ids_sample: number[];
  season_averages_count: number;
  season_averages_empty_reason: 'empty' | 'error' | null;
  season_averages_error: UpstreamError | null;
  stats_logs_count_total: number;
  stats_error: UpstreamError | null;
  stats_logs_count_sample_player: { player_id: number; games: number; minutes_values: number[] } | null;
  grouped_players_with_logs: number;
  final_candidates_before_sort: number;
  final_returned: number;
}

/**
 * Machine-readable reason when `data` is empty.
 * The frontend uses this to show a specific, helpful empty-state message
 * instead of a generic "no players matched".
 */
export type EdgeEmptyReason =
  | 'past_season'           // season < BDL_SEASON → no recent game logs exist
  | 'filter_too_restrictive' // min_minutes so high that 0 players qualify
  | 'upstream_error'         // BDL returned errors or empty on critical paths
  | 'no_qualifying_players'  // legitimate: no players have a meaningful delta right now
  | null;                    // data is non-empty — no reason needed

// ── core computation (exported for reuse by alerts endpoint) ──────────────────

/**
 * Computes the edge feed entries for a given stat/season without headshot enrichment.
 * Returns entries sorted by |delta| descending, capped at 20.
 * Pass a debugOut object to collect pipeline stage counts.
 */
/**
 * Deterministic daily shuffle — same seed per 4-hour window so the feed is
 * stable within a window but rotates across the day.  Uses a simple hash-based
 * Fisher-Yates shuffle seeded by the epoch day segment.
 */
function dailyShuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  const seed = Math.floor(Date.now() / (4 * 60 * 60 * 1000)); // changes every 4h
  let s = seed;
  const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function computeEdgeFeed(
  stat: StatKey,
  minMin: number,
  season: number,
  debugOut?: EdgeDebugInfo,
): Promise<EdgeEntry[]> {
  const allPlayers = await getActivePlayers();

  // Fetch today's games + props in parallel (non-fatal)
  const [todaysGames, allProps] = await Promise.all([
    getTodaysGames().catch(() => [] as TodayGame[]),
    getAllTodaysProps().catch(() => new Map<string, PlayerProp>()),
  ]);

  const playingToday = getPlayerIdsPlayingToday(allPlayers, todaysGames);

  // Player selection: prefer today's players; supplement with shuffle sample
  const todaysPlayers = allPlayers.filter(p => playingToday.has(p.id));
  let players: ActivePlayer[];
  if (todaysPlayers.length >= 10) {
    const extras = dailyShuffle(allPlayers.filter(p => !playingToday.has(p.id))).slice(0, 50);
    players = [...todaysPlayers, ...extras];
  } else {
    const SAMPLE_SIZE = 150;
    players = allPlayers.length > SAMPLE_SIZE
      ? dailyShuffle(allPlayers).slice(0, SAMPLE_SIZE)
      : allPlayers;
  }
  const ids = players.map(p => p.id);

  if (debugOut) {
    debugOut.active_players_count      = allPlayers.length;
    debugOut.active_player_ids_sample  = ids.slice(0, 5);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function captureErr(err: any, path: string): UpstreamError {
    const resp   = err?.response;
    const status: number | null = resp?.status ?? null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body   = resp?.data;
    const bodyStr = body
      ? (typeof body === 'string' ? body : JSON.stringify(body)).slice(0, 200)
      : null;
    return { status, message: err?.message ?? String(err), url: `${BDL_BASE}${path}`, body_preview: bodyStr };
  }

  // Batch season averages (GOAT tier) + recent game logs in parallel
  let statsUpstreamErr: UpstreamError | null = null;

  // Only fetch recent games (last ~3 weeks) — enough for L5 calc.
  // BDL's sort=date&direction=desc is unreliable, and batch queries with
  // many player_ids cap at per_page=100 total rows.  By using start_date
  // we limit the data to recent games, and by chunking player IDs (~20 per
  // chunk) we ensure each chunk fits in one page.
  const threWeeksAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);

  const CHUNK = 20; // ~20 players × ~10 games each ≈ 200, fits in per_page=100 comfortably
  const idChunks: number[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK) idChunks.push(ids.slice(i, i + CHUNK));

  const [seasonAvgMap, ...statsChunkResults] = await Promise.all([
    getBatchSeasonAverages(ids, season).catch(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new Map<number, Record<string, any>>();
    }),
    ...idChunks.map(chunk =>
      bdlBatch('/stats', {
        'player_ids[]': chunk,
        'seasons[]':    [season],
        per_page:       100,
        start_date:     threWeeksAgo,
      }).catch((err: unknown) => {
        if (!statsUpstreamErr) statsUpstreamErr = captureErr(err, '/stats');
        return { data: [] };
      }),
    ),
  ]);

  // Flatten + deduplicate by row ID
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statsResData: any[] = [];
  const seenIds = new Set<number>();
  for (const r of statsChunkResults) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const g of (r?.data ?? []) as any[]) {
      const rid = g.id;
      if (rid && seenIds.has(rid)) continue;
      if (rid) seenIds.add(rid);
      statsResData.push(g);
    }
  }

  if (debugOut) {
    debugOut.season_averages_count        = seasonAvgMap.size;
    debugOut.season_averages_empty_reason = seasonAvgMap.size === 0 ? 'empty' : null;
    debugOut.season_averages_error        = null;
    debugOut.stats_logs_count_total       = statsResData.length;
    debugOut.stats_error                  = statsUpstreamErr;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gameMap = new Map<number, any[]>();
  for (const g of statsResData) {
    const pid: number = g?.player?.id ?? g?.player_id;
    if (!pid || parseMins(g.min) < minMin) continue;
    if (!gameMap.has(pid)) gameMap.set(pid, []);
    gameMap.get(pid)!.push(g);
  }

  // Sort each player's games by date DESCENDING (newest first).
  // BDL's sort=date&direction=desc is unreliable — often returns ascending.
  for (const [, games] of gameMap) {
    games.sort((a, b) => {
      const da = a.game?.date || '';
      const db = b.game?.date || '';
      return db.localeCompare(da);
    });
  }

  if (debugOut) {
    debugOut.grouped_players_with_logs = [...gameMap.values()].filter(gs => gs.length >= 3).length;
    const sampleEntry = players.find(p => gameMap.has(p.id));
    if (sampleEntry) {
      const sampleGames = gameMap.get(sampleEntry.id)!;
      debugOut.stats_logs_count_sample_player = {
        player_id:      sampleEntry.id,
        games:          sampleGames.length,
        minutes_values: sampleGames.slice(0, 5).map(g => Math.round(parseMins(g.min) * 10) / 10),
      };
    } else {
      debugOut.stats_logs_count_sample_player = null;
    }
  }

  const entries: EdgeEntry[] = [];
  for (const p of players) {
    const games = gameMap.get(p.id) ?? [];
    const seasonRow = seasonAvgMap.get(p.id);

    // Need either batch season avg OR enough game logs
    if (!seasonRow && games.length < 3) continue;

    // Season avg from batch endpoint (preferred) or computed from logs
    let seasonAvg: number;
    if (seasonRow) {
      seasonAvg = stat === 'pra'
        ? (Number(seasonRow.pts) || 0) + (Number(seasonRow.reb) || 0) + (Number(seasonRow.ast) || 0)
        : Number(seasonRow.pts) || 0;
    } else {
      const allVals = games.map(g => gameVal(g, stat));
      seasonAvg = Math.round((allVals.reduce((a, b) => a + b, 0) / allVals.length) * 10) / 10;
    }
    if (seasonAvg <= 0) continue;

    // Recent avg from game logs (L5)
    const recentVals = games.slice(0, 5).map(g => gameVal(g, stat));
    if (recentVals.length < 3) {
      // If we have season avg but no recent logs, skip (no delta to compute)
      continue;
    }

    const last5Vals = recentVals.map(v => Math.round(v * 10) / 10);
    const recentAvg = Math.round((last5Vals.reduce((a, b) => a + b, 0) / last5Vals.length) * 10) / 10;

    // Real prop line lookup
    const propStatKey = stat === 'pra' ? 'pra' : 'pts';
    const realProp = allProps.get(`${p.id}:${propStatKey}`) ?? null;

    // Delta is recent vs real prop line (if available), otherwise vs season avg
    const baseline = realProp ? realProp.line_value : seasonAvg;
    const delta = Math.round((recentAvg - baseline) * 10) / 10;

    entries.push({
      player_id:      p.id,
      player_name:    `${p.first_name} ${p.last_name}`,
      team:           p.team?.full_name    ?? '—',
      team_abbrev:    p.team?.abbreviation ?? '—',
      photo_url:      null,
      season_avg:     Math.round(seasonAvg * 10) / 10,
      recent_avg:     recentAvg,
      delta,
      last5:          last5Vals,
      games_played:   seasonRow?.games_played ?? games.length,
      prop_line:      realProp?.line_value ?? null,
      line_source:    realProp?.vendor ?? null,
      over_odds:      realProp?.over_odds ?? null,
      under_odds:     realProp?.under_odds ?? null,
      has_game_today: playingToday.has(p.id),
    });
  }

  if (debugOut) {
    debugOut.final_candidates_before_sort = entries.length;
  }

  // Sort: today's players first, then by |delta| descending
  entries.sort((a, b) => {
    if (a.has_game_today && !b.has_game_today) return -1;
    if (!a.has_game_today && b.has_game_today) return 1;
    return Math.abs(b.delta) - Math.abs(a.delta);
  });
  const result = entries.slice(0, 20);

  if (debugOut) {
    debugOut.final_returned = result.length;
  }

  return result;
}

// ── shareable card (HTML with dynamic OG tags) ──────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function serveCard(req: VercelRequest, res: VercelResponse): void {
  const p = (req.query.p as string) || '';
  const n = (req.query.n as string) || 'Player';
  const t = (req.query.t as string) || '';
  const s = (req.query.s as string) || 'pts';
  const d = (req.query.d as string) || '0';
  const a = (req.query.a as string) || '0';
  const r = (req.query.r as string) || '0';
  const l = (req.query.l as string) || '';

  const delta = parseFloat(d);
  const isOver = delta > 0;
  const direction = isOver ? 'Over' : 'Under';
  const arrow = isOver ? '\u2191' : '\u2193';
  const statLabel = s === 'pra' ? 'PRA' : 'PTS';
  const sign = delta > 0 ? '+' : '';
  const lineStr = l ? ` | Line: ${l}` : '';

  const title = `${n} (${t}) ${statLabel} ${arrow} ${sign}${d}`;
  const description = `L5 avg ${r} vs Season avg ${a}${lineStr} | ${direction} trend detected`;
  const edgeUrl = `/edge?highlight=${encodeURIComponent(p)}&stat=${encodeURIComponent(s)}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${escapeHtml(title)} \u2014 EdgeDetector.ai</title>
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:type" content="website">
<meta property="og:image" content="https://edgedetector.ai/og-image.png">
<meta property="og:url" content="https://edgedetector.ai${edgeUrl}">
<meta property="og:site_name" content="EdgeDetector.ai">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="https://edgedetector.ai/og-image.png">
<script>window.location.replace("${edgeUrl}");</script>
</head>
<body style="font-family:Inter,system-ui,sans-serif;background:#0a0a0a;color:#e0e0e0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px">
<div style="text-align:center;max-width:400px">
<h1 style="font-size:24px;margin:0 0 8px">${escapeHtml(n)} <span style="color:#888">(${escapeHtml(t)})</span></h1>
<div style="font-size:36px;font-weight:800;color:${isOver ? '#4caf50' : '#f44336'};margin:12px 0">${statLabel} ${sign}${escapeHtml(d)}</div>
<p style="color:#aaa;font-size:14px;line-height:1.6">L5 avg: <strong style="color:#fff">${escapeHtml(r)}</strong> &middot; Season avg: <strong style="color:#fff">${escapeHtml(a)}</strong>${l ? ` &middot; Line: <strong style="color:#fff">${escapeHtml(l)}</strong>` : ''}</p>
<a href="${edgeUrl}" style="display:inline-block;margin-top:20px;padding:12px 28px;background:#1976d2;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">View on EdgeDetector.ai</a>
<p style="margin-top:24px;font-size:11px;color:#555">Redirecting...</p>
</div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.status(200).send(html);
}

// ── handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  // Shareable card: return HTML with OG tags instead of JSON
  if ('card' in req.query) return serveCard(req, res);

  const stat    = ((req.query.stat as string) || 'pts') as StatKey;
  const minMin  = parseFloat(req.query.min_minutes as string) || 20;
  const season  = parseInt(req.query.season as string) || BDL_SEASON;
  const isDebug = req.query.debug === '1';

  const debugOut: EdgeDebugInfo | undefined = isDebug ? {
    active_players_count:         0,
    active_player_ids_sample:     [],
    season_averages_count:        0,
    season_averages_empty_reason: null,
    season_averages_error:        null,
    stats_logs_count_total:       0,
    stats_error:                  null,
    stats_logs_count_sample_player: null,
    grouped_players_with_logs:    0,
    final_candidates_before_sort: 0,
    final_returned:               0,
  } : undefined;

  try {
    // Debug mode uses computeEdgeFeed directly to capture pipeline diagnostics.
    // Production path goes through the adapter (zero behaviour change — NBAAdapter calls computeEdgeFeed internally).
    const league = (req.query.league as string) || 'nba';
    let upstreamHadError = false;
    const top = isDebug
      ? await computeEdgeFeed(stat, minMin, season, debugOut)
      : await (async () => {
          try {
            return (await AdapterFactory.get(league).edgeFeed({ stat, minMinutes: minMin, season })) as EdgeEntry[];
          } catch {
            upstreamHadError = true;
            return [] as EdgeEntry[];
          }
        })();

    // Enrich with headshots (in parallel, non-fatal)
    await Promise.all(
      top.map(async e => {
        try {
          const pid = await findNbaPersonId(e.player_name);
          if (pid) e.photo_url = buildNbaPhotoUrl(pid);
        } catch { /* silent */ }
      })
    );

    // Determine empty-state reason so the frontend can show a specific message
    let reason: EdgeEmptyReason = null;
    if (top.length === 0) {
      if (season < BDL_SEASON) {
        reason = 'past_season';
      } else if (upstreamHadError || (debugOut && (debugOut.season_averages_error || debugOut.stats_error))) {
        reason = 'upstream_error';
      } else if (minMin > 35) {
        reason = 'filter_too_restrictive';
      } else {
        reason = 'no_qualifying_players';
      }
    }

    res.json({
      data: top,
      stat,
      season,
      generated_at: new Date().toISOString(),
      ...(reason && { reason }),
      ...(isDebug && { debug: debugOut }),
    });
  } catch (err) {
    console.error('[edge] error:', (err as Error).message);
    res.status(500).json({ error: 'Failed to generate edge feed', reason: 'upstream_error' as EdgeEmptyReason });
  }
}
