/**
 * GET /api/edge?stat=pts&min_minutes=20&season=2025
 *
 * Returns a ranked list of active players ordered by |delta| between their
 * season average and their last-5-game average for the chosen stat.
 * Uses two batch API calls: one for season averages, one for recent game logs.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { applyCors, BDL_BASE, buildNbaPhotoUrl, findNbaPersonId, BDL_SEASON } from './_lib.js';
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
const PLAYER_TTL = 24 * 60 * 60 * 1000;

async function getActivePlayers(): Promise<ActivePlayer[]> {
  const now = Date.now();
  if (_playerCache && now - _playerCache.ts < PLAYER_TTL) return _playerCache.data;
  const raw = await bdlBatch('/players/active', { per_page: 100 });
  const data: ActivePlayer[] = raw?.data ?? [];
  _playerCache = { data, ts: Date.now() };
  return data;
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
  /**
   * streak_warning: true when recent_avg deviates >30% from season_avg with no known
   * structural reason. High-delta edges without structural backing (B2B, injury, defense)
   * are likely hot/cold streaks that revert — NOT reliable betting edges.
   * Rule 12: Only bet structural edges. Regression edges (streak_warning=true) require
   * explicit structural confirmation before acting on them.
   */
  streak_warning: boolean;
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

// ── core computation (exported for reuse by alerts endpoint) ──────────────────

/**
 * Computes the edge feed entries for a given stat/season without headshot enrichment.
 * Returns entries sorted by |delta| descending, capped at 20.
 * Pass a debugOut object to collect pipeline stage counts.
 */
export async function computeEdgeFeed(
  stat: StatKey,
  minMin: number,
  season: number,
  debugOut?: EdgeDebugInfo,
): Promise<EdgeEntry[]> {
  const players = await getActivePlayers();
  const ids     = players.map(p => p.id);

  if (debugOut) {
    debugOut.active_players_count      = players.length;
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

  // Season averages endpoint only accepts a single player_id — not batch-compatible.
  // Instead, compute the season baseline directly from game logs:
  //   season_avg = mean of ALL fetched games for the player
  //   recent_avg = mean of the 5 most recent games
  // Player IDs are chunked into batches of 50 to avoid URL length limits,
  // then each batch fetches 2 pages (200 games). All batches run in parallel.
  let statsUpstreamErr: UpstreamError | null = null;

  const CHUNK_SIZE = 50;
  const idChunks: number[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    idChunks.push(ids.slice(i, i + CHUNK_SIZE));
  }

  const chunkResults = await Promise.all(
    idChunks.flatMap((chunk, ci) =>
      [1, 2].map(page =>
        bdlBatch('/stats', {
          'player_ids[]': chunk,
          'seasons[]':    [season],
          per_page:       100,
          sort:           'date',
          direction:      'desc',
          page,
        }).catch((err: unknown) => {
          if (ci === 0 && page === 1) statsUpstreamErr = captureErr(err, '/stats');
          return { data: [] };
        })
      )
    )
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statsResData: any[] = chunkResults.flatMap(p => p?.data ?? []);

  if (debugOut) {
    debugOut.season_averages_count        = 0; // removed — computed from logs
    debugOut.season_averages_empty_reason = null;
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
    if (games.length < 3) continue;

    // season_avg = mean of ALL fetched games (season-to-date baseline from logs)
    const allVals   = games.map(g => gameVal(g, stat));
    const seasonAvg = Math.round((allVals.reduce((a, b) => a + b, 0) / allVals.length) * 10) / 10;

    // recent_avg = mean of 5 most recent games (array is date-desc)
    const last5Vals = allVals.slice(0, 5).map(v => Math.round(v * 10) / 10);
    const recentAvg = Math.round((last5Vals.reduce((a, b) => a + b, 0) / last5Vals.length) * 10) / 10;

    const delta = Math.round((recentAvg - seasonAvg) * 10) / 10;
    // streak_warning: flag large deviations (>30% of season avg) that are likely
    // hot/cold streaks rather than structural edges. The daily picks agent should
    // confirm a structural reason (B2B, injury, defense mismatch) before acting on
    // any entry with streak_warning=true. (Rule 12 in lessons.md)
    const streakWarning = seasonAvg > 0 && Math.abs(delta / seasonAvg) > 0.30;

    entries.push({
      player_id:      p.id,
      player_name:    `${p.first_name} ${p.last_name}`,
      team:           p.team?.full_name    ?? '—',
      team_abbrev:    p.team?.abbreviation ?? '—',
      photo_url:      null,
      season_avg:     seasonAvg,
      recent_avg:     recentAvg,
      delta,
      last5:          last5Vals,
      games_played:   games.length,
      streak_warning: streakWarning,
    });
  }

  if (debugOut) {
    debugOut.final_candidates_before_sort = entries.length;
  }

  entries.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const result = entries.slice(0, 20);

  if (debugOut) {
    debugOut.final_returned = result.length;
  }

  return result;
}

// ── handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

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
    const top = isDebug
      ? await computeEdgeFeed(stat, minMin, season, debugOut)
      : (await AdapterFactory.get('nba').edgeFeed({ stat, minMinutes: minMin, season })) as EdgeEntry[];

    // Enrich with headshots (in parallel, non-fatal)
    await Promise.all(
      top.map(async e => {
        try {
          const pid = await findNbaPersonId(e.player_name);
          if (pid) e.photo_url = buildNbaPhotoUrl(pid);
        } catch { /* silent */ }
      })
    );

    // Determine empty reason for the frontend
    let reason: string | null = null;
    if (top.length === 0) {
      if (season < BDL_SEASON)  reason = 'past_season';
      else if (minMin > 35)     reason = 'filter_too_restrictive';
      else                      reason = 'no_qualifying_players';
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
    res.status(500).json({ error: 'Failed to generate edge feed', reason: 'upstream_error' });
  }
}
