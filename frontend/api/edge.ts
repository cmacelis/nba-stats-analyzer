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
import { getFreshnessStatus, type FreshnessStatus } from './_lib/freshness-check.js';
import { getCacheTTL } from './_config/edge.js';

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
  /**
   * confidence: 0-100 score reflecting data quality and reliability.
   * Based on sample size, variance, consistency, and recent data strength.
   * Higher values indicate more reliable edges.
   */
  confidence: number;
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

// ── confidence calculation ───────────────────────────────────────────────────

/**
 * Calculate confidence score (0-100) based on data quality metrics.
 * Factors:
 * 1. Sample size (games played) - more games = higher confidence
 * 2. Variance (stability) - lower variance = higher confidence  
 * 3. Consistency (hit rate) - more consistent performance = higher confidence
 * 4. Recent data strength - stronger recent performance = higher confidence
 */
function calculateConfidence(
  allValues: number[],
  last5Values: number[],
  seasonAvg: number,
  recentAvg: number,
  gamesPlayed: number
): number {
  if (gamesPlayed < 3 || allValues.length < 3) {
    return 0; // Insufficient data
  }

  // 1. Sample size factor (0-30 points)
  // Max at 15+ games, min at 3 games
  const sampleSizeFactor = Math.min(30, Math.max(0, (gamesPlayed - 3) * 2.5));
  
  // 2. Variance factor (0-30 points)
  // Calculate coefficient of variation (CV) = std dev / mean
  const mean = allValues.reduce((sum, val) => sum + val, 0) / allValues.length;
  const variance = allValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / allValues.length;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? stdDev / mean : 1;
  // Lower CV = higher confidence (inverse relationship)
  const varianceFactor = cv > 0 ? Math.min(30, 30 * (1 - Math.min(1, cv))) : 30;
  
  // 3. Consistency factor (0-20 points)
  // Check how many games are within 20% of season average
  const withinThreshold = allValues.filter(val => 
    Math.abs(val - seasonAvg) / (seasonAvg || 1) <= 0.2
  ).length;
  const consistencyRate = withinThreshold / allValues.length;
  const consistencyFactor = consistencyRate * 20;
  
  // 4. Recent data strength factor (0-20 points)
  // Compare recent performance to season average
  // Strong, consistent recent data gets higher score
  const recentStability = last5Values.length >= 3 ? 
    (1 - Math.abs(recentAvg - seasonAvg) / (seasonAvg || 1)) * 20 : 0;
  const recentStrengthFactor = Math.max(0, Math.min(20, recentStability));
  
  // Calculate total confidence
  let confidence = sampleSizeFactor + varianceFactor + consistencyFactor + recentStrengthFactor;
  
  // Apply penalties for extreme cases
  if (gamesPlayed < 5) confidence *= 0.7; // Small sample penalty
  if (cv > 0.5) confidence *= 0.8; // High variance penalty
  if (consistencyRate < 0.5) confidence *= 0.9; // Low consistency penalty
  
  // Ensure 0-100 range
  confidence = Math.max(0, Math.min(100, Math.round(confidence)));
  
  // Debug logging for extreme cases
  if (confidence < 30 || confidence > 90) {
    console.log(`[edge-confidence] ${confidence}% - games:${gamesPlayed}, cv:${cv.toFixed(2)}, consistency:${(consistencyRate*100).toFixed(0)}%`);
  }
  
  return confidence;
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

  // ── Step 1: fetch recent games (last 30 days) ───────────────────────────
  // Instead of relying on /players/active (returns low/legacy IDs), we fetch
  // recent games via /games, then pull player stats via /stats?game_ids[].
  // 30 days gives ~15 games per player: enough for a meaningful baseline
  // (all games) vs recent (last 5) delta.
  const today       = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 86_400_000);
  const startDate   = thirtyDaysAgo.toISOString().slice(0, 10);
  const endDate     = today.toISOString().slice(0, 10);

  let statsUpstreamErr: UpstreamError | null = null;
  const gamesPages = await Promise.all(
    [1, 2, 3, 4, 5].map((page, i) =>
      bdlBatch('/games', {
        'start_date': startDate,
        'end_date':   endDate,
        per_page:     100,
        page,
      }).catch((err: unknown) => {
        if (i === 0) statsUpstreamErr = captureErr(err, '/games');
        return { data: [] };
      })
    )
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentGames: any[] = gamesPages.flatMap(p => p?.data ?? []);
  const gameIds = recentGames.map((g: { id: number }) => g.id);

  // Build a game ID → date lookup from the /games response (authoritative dates)
  const gameDateMap = new Map<number, string>();
  for (const g of recentGames) {
    if (g?.id && g?.date) gameDateMap.set(g.id, g.date as string);
  }

  if (debugOut) {
    debugOut.active_players_count     = gameIds.length;
    debugOut.active_player_ids_sample = gameIds.slice(0, 5);
  }

  // ── Step 2: fetch stats for those games ─────────────────────────────────
  const CHUNK_SIZE = 50;
  const gameIdChunks: number[][] = [];
  for (let i = 0; i < gameIds.length; i += CHUNK_SIZE) {
    gameIdChunks.push(gameIds.slice(i, i + CHUNK_SIZE));
  }

  const statsResults = await Promise.all(
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
  const statsResData: any[] = statsResults.flatMap(p => p?.data ?? []);

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
      };
    } else {
      debugOut.stats_logs_count_sample_player = null;
    }
  }

  // ── Step 4: compute edges ───────────────────────────────────────────────
  const entries: EdgeEntry[] = [];
  for (const [pid, rawGames] of gameMap) {
    // Sort per-player games date-desc using authoritative gameDateMap
    // (BDL's embedded game.date can be wrong when fetching by game_ids[])
    const games = rawGames.sort((a, b) => {
      const gidA = (a?.game as Record<string, unknown>)?.id as number ?? a?.game;
      const gidB = (b?.game as Record<string, unknown>)?.id as number ?? b?.game;
      const da = gameDateMap.get(gidA) ?? '';
      const db = gameDateMap.get(gidB) ?? '';
      return db.localeCompare(da);
    });
    if (games.length < 3) continue;

    const allVals   = games.map(g => gameVal(g, stat));
    const seasonAvg = Math.round((allVals.reduce((a, b) => a + b, 0) / allVals.length) * 10) / 10;

    const last5Vals = allVals.slice(0, 5).map(v => Math.round(v * 10) / 10);
    const recentAvg = Math.round((last5Vals.reduce((a, b) => a + b, 0) / last5Vals.length) * 10) / 10;

    // No daysSince filter needed — the 30-day game window already
    // guarantees all players here have played recently.
    // Derive last_game_date from the most recent game in the window.
    const g0GameId = (games[0]?.game as Record<string, unknown>)?.id as number ?? games[0]?.game;
    const lastGameDate = gameDateMap.get(g0GameId)
      ?? (games[0]?.game as Record<string, unknown>)?.date as string
      ?? '';
    const daysSince = lastGameDate
      ? Math.floor((Date.now() - new Date(lastGameDate).getTime()) / 86_400_000)
      : 0;

    const delta = Math.round((recentAvg - seasonAvg) * 10) / 10;
    const streakWarning = seasonAvg > 0 && Math.abs(delta / seasonAvg) > 0.30;

    // Extract player info from the stat log itself
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const playerObj = games[0]?.player as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teamObj   = games[0]?.team as any;

    // Stat Completeness Guard - Validate before adding to edge pool
    // 1. season_avg exists and is a valid number
    // 2. recent_avg exists and is a valid number  
    // 3. games_played >= 5
    // 4. last5 exists and has at least 3 numeric entries
    const playerName = playerObj ? `${playerObj.first_name} ${playerObj.last_name}` : `Player ${pid}`;
    
    // Check 1 & 2: valid numbers (not NaN, not null, finite)
    const isSeasonAvgValid = !isNaN(seasonAvg) && isFinite(seasonAvg) && seasonAvg !== null;
    const isRecentAvgValid = !isNaN(recentAvg) && isFinite(recentAvg) && recentAvg !== null;
    
    // Check 3: minimum games played
    const hasEnoughGames = games.length >= 5;
    
    // Check 4: last5 array has at least 3 numeric entries
    const last5ValidCount = last5Vals.filter(v => !isNaN(v) && isFinite(v)).length;
    const hasValidLast5 = last5ValidCount >= 3;
    
    if (!isSeasonAvgValid || !isRecentAvgValid || !hasEnoughGames || !hasValidLast5) {
      console.log(`[edge] Skipping ${playerName} - invalid stat data`, {
        pid,
        seasonAvgValid: isSeasonAvgValid,
        recentAvgValid: isRecentAvgValid,
        gamesCount: games.length,
        last5ValidCount,
        seasonAvg,
        recentAvg,
        last5Vals
      });
      continue; // Skip this player entirely
    }

    // Calculate confidence score based on data quality
    const confidence = calculateConfidence(
      allVals,
      last5Vals,
      seasonAvg,
      recentAvg,
      games.length
    );

    entries.push({
      player_id:            pid,
      player_name:          playerName,
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
      confidence,
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
  
  // Get today's date for freshness check (edges are typically for current/recent data)
  const today = new Date().toISOString().slice(0, 10);

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
    // Check data freshness (non-blocking, fail-open)
    let freshnessStatus: FreshnessStatus = 'unknown';
    try {
      freshnessStatus = await getFreshnessStatus(today);
    } catch (freshnessError) {
      console.warn(`[edge] Freshness check failed: ${freshnessError}`);
      // Fail-open: proceed with unknown status
    }

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

    // Calculate cache TTL based on edge count and freshness
    const cacheTTL = getCacheTTL(top.length, freshnessStatus);
    const generatedAt = new Date().toISOString();

    res.json({
      data: top,
      stat,
      season,
      generated_at: generatedAt,
      freshness: freshnessStatus,
      cache_ttl: cacheTTL,
      ...(reason && { reason }),
      ...(isDebug && { debug: debugOut }),
      // Always include diagnostics when empty to help debug pipeline issues
      // Note: Keeping _diag for backward compatibility with existing clients
      ...(top.length === 0 && { _diag: debugOut }),
    });

    // Log cache decision for monitoring
    console.log(`[edge] Generated ${top.length} edges, freshness: ${freshnessStatus}, cache TTL: ${cacheTTL}s`);
  } catch (err) {
    console.error('[edge] error:', (err as Error).message);
    res.status(500).json({ error: 'Failed to generate edge feed', reason: 'upstream_error' });
  }
}
