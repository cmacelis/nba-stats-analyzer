/**
 * GET /api/edge?stat=pts&min_minutes=20&season=2025
 *
 * Returns a ranked list of active players ordered by |delta| between their
 * season average and their last-5-game average for the chosen stat.
 * Uses two batch API calls: one for season averages, one for recent game logs.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { applyCors, BDL_BASE, buildNbaPhotoUrl, findNbaPersonId, BDL_SEASON, VERSION } from './_lib.js';

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
  /** ISO date of the player's most recent qualifying game */
  last_game_date: string;
  /** Days since last qualifying game — players >10 days are excluded (likely injured/inactive) */
  days_since_last_game: number;
  /**
   * streak_warning: true when recent_avg deviates >30% from season_avg.
   * High-delta entries without structural backing (B2B, injury, defense) are likely
   * hot/cold streaks that revert. Rule 12: confirm structural reason before acting.
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

  // ── Step 1: fetch recent games to discover active player IDs ────────────
  // Instead of relying on /players/active (returns low/legacy IDs),
  // fetch the last 14 days of games, then pull stats for those game IDs.
  // This ensures we only process players who actually played recently.
  const today    = new Date();
  const twoWeeksAgo = new Date(today.getTime() - 14 * 86_400_000);
  const startDate = twoWeeksAgo.toISOString().slice(0, 10); // YYYY-MM-DD
  const endDate   = today.toISOString().slice(0, 10);

  let gamesUpstreamErr: UpstreamError | null = null;
  const gamesPages = await Promise.all(
    [1, 2, 3].map((page, i) =>
      bdlBatch('/games', {
        'start_date': startDate,
        'end_date':   endDate,
        per_page:     100,
        page,
      }).catch((err: unknown) => {
        if (i === 0) gamesUpstreamErr = captureErr(err, '/games');
        return { data: [] };
      })
    )
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentGames: any[] = gamesPages.flatMap(p => p?.data ?? []);
  const gameIds = recentGames.map((g: { id: number }) => g.id);

  if (debugOut) {
    debugOut.active_players_count     = gameIds.length; // repurposed: recent game count
    debugOut.active_player_ids_sample = gameIds.slice(0, 5); // repurposed: sample game IDs
  }

  // ── Step 2: discover unique player IDs from recent game stats ─────────
  let statsUpstreamErr: UpstreamError | null = gamesUpstreamErr;

  // Fetch stats for recent games to discover who actually played
  const CHUNK_SIZE = 50;
  const gameIdChunks: number[][] = [];
  for (let i = 0; i < gameIds.length; i += CHUNK_SIZE) {
    gameIdChunks.push(gameIds.slice(i, i + CHUNK_SIZE));
  }

  const discoveryResults = await Promise.all(
    gameIdChunks.flatMap((chunk, ci) =>
      [1, 2, 3].map(page =>
        bdlBatch('/stats', {
          'game_ids[]':  chunk,
          per_page:      100,
          page,
        }).catch((err: unknown) => {
          if (ci === 0 && page === 1 && !statsUpstreamErr) statsUpstreamErr = captureErr(err, '/stats');
          return { data: [] };
        })
      )
    )
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const discoveryData: any[] = discoveryResults.flatMap(p => p?.data ?? []);
  const activePlayerIds = [...new Set(discoveryData.map(g => g?.player?.id).filter(Boolean) as number[])];

  // ── Step 3: fetch season stats for active players (last 60 days) ──────
  // BDL ignores sort/direction params and always returns ascending.
  // Fetching the full season would require too many pages, so we limit to
  // the last 60 days via start_date for a meaningful baseline window.
  const sixtyDaysAgo = new Date(today.getTime() - 60 * 86_400_000);
  const baselineStart = sixtyDaysAgo.toISOString().slice(0, 10);

  const playerIdChunks: number[][] = [];
  for (let i = 0; i < activePlayerIds.length; i += CHUNK_SIZE) {
    playerIdChunks.push(activePlayerIds.slice(i, i + CHUNK_SIZE));
  }

  const seasonResults = await Promise.all(
    playerIdChunks.flatMap((chunk, ci) =>
      [1, 2, 3, 4, 5].map(page =>
        bdlBatch('/stats', {
          'player_ids[]': chunk,
          'seasons[]':    [season],
          start_date:     baselineStart,
          per_page:       100,
          page,
        }).catch((err: unknown) => {
          if (ci === 0 && page === 1 && !statsUpstreamErr) statsUpstreamErr = captureErr(err, '/stats');
          return { data: [] };
        })
      )
    )
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statsResData: any[] = seasonResults.flatMap(p => p?.data ?? []);

  if (debugOut) {
    debugOut.season_averages_count        = 0;
    debugOut.season_averages_empty_reason = null;
    debugOut.season_averages_error        = null;
    debugOut.stats_logs_count_total       = statsResData.length;
    debugOut.stats_error                  = statsUpstreamErr;
  }

  // ── Step 3: group by player, filter by minutes ──────────────────────────
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
    const samplePid = [...gameMap.keys()][0];
    if (samplePid) {
      const sampleGames = gameMap.get(samplePid)!;
      const g0 = sampleGames[0];
      debugOut.stats_logs_count_sample_player = {
        player_id:      samplePid,
        games:          sampleGames.length,
        minutes_values: sampleGames.slice(0, 5).map(g => Math.round(parseMins(g.min) * 10) / 10),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sample_game_keys: g0 ? Object.keys(g0) : [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sample_game_date: (g0 as any)?.game?.date ?? (g0 as any)?.date ?? 'NO_DATE_FOUND',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sample_game_obj: g0?.game ?? 'NO_GAME_OBJ',
      } as any;
    } else {
      debugOut.stats_logs_count_sample_player = null;
    }
  }

  // ── Step 4: compute edges ───────────────────────────────────────────────
  const entries: EdgeEntry[] = [];
  for (const [pid, rawGames] of gameMap) {
    // Sort per-player games date-desc (BDL returns ascending)
    const games = rawGames.sort((a, b) => {
      const da = (a?.game as Record<string, unknown>)?.date as string ?? '';
      const db = (b?.game as Record<string, unknown>)?.date as string ?? '';
      return db.localeCompare(da);
    });
    if (games.length < 3) continue;

    const allVals   = games.map(g => gameVal(g, stat));
    const seasonAvg = Math.round((allVals.reduce((a, b) => a + b, 0) / allVals.length) * 10) / 10;

    const last5Vals = allVals.slice(0, 5).map(v => Math.round(v * 10) / 10);
    const recentAvg = Math.round((last5Vals.reduce((a, b) => a + b, 0) / last5Vals.length) * 10) / 10;

    const lastGameDate = (games[0]?.['game'] as Record<string, unknown>)?.['date'] as string ?? '';
    const daysSince = lastGameDate
      ? Math.floor((Date.now() - new Date(lastGameDate).getTime()) / 86_400_000)
      : 999;
    if (daysSince > 10) continue;

    const delta = Math.round((recentAvg - seasonAvg) * 10) / 10;
    const streakWarning = seasonAvg > 0 && Math.abs(delta / seasonAvg) > 0.30;

    // Extract player info from the stat log itself
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const playerObj = games[0]?.player as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teamObj   = games[0]?.team as any;

    entries.push({
      player_id:            pid,
      player_name:          playerObj ? `${playerObj.first_name} ${playerObj.last_name}` : `Player ${pid}`,
      team:                 teamObj?.full_name    ?? '—',
      team_abbrev:          teamObj?.abbreviation ?? '—',
      photo_url:            null,
      season_avg:           seasonAvg,
      recent_avg:           recentAvg,
      delta,
      last5:                last5Vals,
      games_played:         games.length,
      last_game_date:       lastGameDate,
      days_since_last_game: daysSince,
      streak_warning:       streakWarning,
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

  // Health check subpath (merged from health.ts to free a function slot)
  const subpath = (req.query._subpath as string) || '';
  if (subpath === 'health') {
    return res.json({
      status:    'ok',
      version:   VERSION,
      timestamp: new Date().toISOString(),
      uptime:    process.uptime(),
    });
  }

  const stat    = ((req.query.stat as string) || 'pts') as StatKey;
  const minMin  = parseFloat(req.query.min_minutes as string) || 20;
  const season  = parseInt(req.query.season as string) || BDL_SEASON;
  const isDebug = req.query.debug === '1';

  // Always collect diagnostics so we can include them when the result is empty
  const debugOut: EdgeDebugInfo = {
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
  };

  try {
    const top = await computeEdgeFeed(stat, minMin, season, debugOut);

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
      // Always include diagnostics when empty to help debug pipeline issues
      ...(top.length === 0 && { _diag: debugOut }),
    });
  } catch (err) {
    console.error('[edge] error:', (err as Error).message);
    res.status(500).json({ error: 'Failed to generate edge feed', reason: 'upstream_error' });
  }
}
