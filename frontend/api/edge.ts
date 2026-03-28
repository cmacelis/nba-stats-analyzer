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
  confidence_tier: ConfidenceTier;
  edge_score?: number;
  edge_tier?: EdgeTier;
  play_score?: number;
  play_tier?: PlayTier;
  direction?: 'over' | 'under';
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
  empty_game_window_skip?: boolean;
  stats_fetch_params?: { game_ids_count: number; season: number; chunk_count: number };
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

// ── confidence v2 ────────────────────────────────────────────────────────────
// Confidence = "how much should we trust this edge signal?"
// 4 independent factors, each 0-25, summed to 0-100.

/**
 * Sample score (0-25): more games = more trustworthy signal.
 * Linear interpolation: 3→5, 5→10, 10→20, 15+→25.
 */
function sampleScore(gamesPlayed: number): number {
  if (gamesPlayed <= 3) return 5;
  if (gamesPlayed >= 15) return 25;
  // Linear from (3,5) to (15,25)
  return Math.round(5 + ((gamesPlayed - 3) / 12) * 20);
}

/**
 * Consistency score (0-25): low CV in the RECENT window means the trend is real.
 * We measure recent games only — overall CV is irrelevant to signal trust.
 */
function consistencyScore(last5Values: number[]): number {
  if (last5Values.length < 2) return 0;
  const mean = last5Values.reduce((a, b) => a + b, 0) / last5Values.length;
  if (mean <= 0) return 0;
  const variance = last5Values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / last5Values.length;
  const cv = Math.sqrt(variance) / mean;
  // CV < 0.15 → 25, CV > 0.5 → 0, linear between
  if (cv <= 0.15) return 25;
  if (cv >= 0.5) return 0;
  return Math.round(25 * (1 - (cv - 0.15) / 0.35));
}

/**
 * Recency score (0-25): how much recent data exists + directional alignment.
 * 5 recent games → 20, 3 → 10, < 3 → 0.
 * Bonus +5 if last 3 values trend in same direction as the overall delta.
 */
function recencyScore(last5Values: number[], allValues: number[]): number {
  const n = last5Values.length;
  if (n < 3) return 0;

  // Base: scale by recent game count
  const base = n >= 5 ? 20 : n >= 4 ? 15 : 10;

  // Directional bonus: do the last 3 games reinforce the delta direction?
  const overallMean = allValues.reduce((a, b) => a + b, 0) / allValues.length;
  const recentMean = last5Values.reduce((a, b) => a + b, 0) / last5Values.length;
  const deltaDir = recentMean - overallMean; // positive = trending up

  // Check if last 3 games (most recent first) trend in same direction
  const last3 = last5Values.slice(0, 3);
  const trendDir = last3[0] - last3[2]; // newest minus oldest
  const directionalBonus = (deltaDir > 0 && trendDir > 0) || (deltaDir < 0 && trendDir < 0) ? 5 : 0;

  return Math.min(25, base + directionalBonus);
}

/**
 * Data quality score (0-25): is the baseline data solid enough to trust the delta?
 * - Valid seasonAvg (> 0, finite): +10
 * - Enough games (≥5: +5, ≥10: +10)
 * - Low overall CV (< 0.3): +5
 */
function dataQualityScore(seasonAvg: number, gamesPlayed: number, allValues: number[]): number {
  let score = 0;

  // Valid baseline
  if (seasonAvg > 0 && isFinite(seasonAvg)) score += 10;

  // Sample depth
  if (gamesPlayed >= 10) score += 10;
  else if (gamesPlayed >= 5) score += 5;

  // Overall stability (low CV = stable baseline makes delta meaningful)
  if (allValues.length >= 3) {
    const mean = allValues.reduce((a, b) => a + b, 0) / allValues.length;
    if (mean > 0) {
      const variance = allValues.reduce((sum, v) => sum + (v - mean) ** 2, 0) / allValues.length;
      const cv = Math.sqrt(variance) / mean;
      if (cv < 0.3) score += 5;
    }
  }

  return Math.min(25, score);
}

export type ConfidenceTier = 'high' | 'medium' | 'low';

/**
 * Confidence v2: measures trust in the edge signal, not player stability.
 * Returns confidence (0-100) and a discrete tier.
 * Safe fallback: 0 / 'low' if insufficient data.
 */
function computeConfidenceV2(
  allValues: number[],
  last5Values: number[],
  seasonAvg: number,
  _recentAvg: number,
  gamesPlayed: number,
): { confidence: number; confidence_tier: ConfidenceTier } {
  if (gamesPlayed < 3 || allValues.length < 3) {
    return { confidence: 0, confidence_tier: 'low' };
  }

  const s = sampleScore(gamesPlayed);
  const c = consistencyScore(last5Values);
  const r = recencyScore(last5Values, allValues);
  const q = dataQualityScore(seasonAvg, gamesPlayed, allValues);

  const raw = s + c + r + q;
  const confidence = Math.max(0, Math.min(100, Math.round(raw)));

  const confidence_tier: ConfidenceTier =
    confidence >= 70 ? 'high' :
    confidence >= 40 ? 'medium' :
    'low';

  return { confidence, confidence_tier };
}

// ── edge strength / play score (additive, does not modify existing logic) ────

export type EdgeTier = 'elite' | 'strong' | 'moderate' | 'weak';
export type PlayTier = 'A' | 'B' | 'C' | 'D';

function getEdgeStrength(delta: number): { edge_score: number; edge_tier: EdgeTier } {
  const absDelta = Math.abs(delta);
  if (absDelta >= 8) return { edge_score: 90, edge_tier: 'elite' };
  if (absDelta >= 5) return { edge_score: 75, edge_tier: 'strong' };
  if (absDelta >= 3) return { edge_score: 60, edge_tier: 'moderate' };
  return { edge_score: 40, edge_tier: 'weak' };
}

function calculatePlayScore(edgeScore: number, confidence: number): number {
  return Math.round(edgeScore * 0.6 + confidence * 0.4);
}

function getPlayTier(score: number): PlayTier {
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  return 'D';
}

function getDirection(delta: number): 'over' | 'under' {
  return delta >= 0 ? 'over' : 'under';
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
  // If no games found in the window, skip stats fetch entirely to avoid
  // receiving artificial/test data from BDL API with empty game_ids[]
  if (debugOut) {
    debugOut.empty_game_window_skip = gameIds.length === 0;
  }

  let statsResData: any[] = [];

  // EXPERIMENT v5: CHUNK_SIZE=10, pages 1-2 per chunk, all parallel.
  // 10 games × ~26 players = ~260 rows → page 1 gets 100, page 2 gets remaining.
  // 500/10 = 50 chunks × 2 pages = 100 parallel requests. Must fit Vercel 10s.
  const CHUNK_SIZE = 10;
  const PAGES_PER_CHUNK = 2;
  let totalPagesFetched = 0;

  if (gameIds.length > 0) {
    const gameIdChunks: number[][] = [];
    for (let i = 0; i < gameIds.length; i += CHUNK_SIZE) {
      gameIdChunks.push(gameIds.slice(i, i + CHUNK_SIZE));
    }

    // Fire all chunk×page requests in parallel
    const statsResults = await Promise.all(
      gameIdChunks.flatMap((chunk, ci) =>
        Array.from({ length: PAGES_PER_CHUNK }, (_, pi) => pi + 1).map(page => {
          totalPagesFetched++;
          return bdlBatch('/stats', {
            'game_ids[]': chunk,
            per_page:     100,
            page,
          }).catch((err: unknown) => {
            if (ci === 0 && page === 1 && !statsUpstreamErr) {
              statsUpstreamErr = captureErr(err, '/stats');
            }
            return { data: [] };
          });
        })
      )
    );

    const rawStatsResData = statsResults.flatMap(p => p?.data ?? []);

    // ── Deduplication: remove duplicate (player_id, game_id) rows ─────────────
    // This fixes the flat last5 issue caused by BDL API returning duplicate stats rows
    const seenKeys = new Set<string>();
    const dedupedStatsResData: any[] = [];
    let rowsWithoutIds = 0;

    for (const row of rawStatsResData) {
      const playerId: number = row?.player?.id ?? row?.player_id;
      const gameId: number = (row?.game as Record<string, unknown>)?.id as number ?? row?.game;

      if (!playerId || !gameId) {
        dedupedStatsResData.push(row);
        rowsWithoutIds++;
        continue;
      }

      const key = `${playerId}:${gameId}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        dedupedStatsResData.push(row);
      }
    }

    statsResData = dedupedStatsResData;

    // Store dedupe info for debug output
    const dedupeInfo = {
      before_dedupe: rawStatsResData.length,
      after_dedupe: statsResData.length,
      duplicates_removed: rawStatsResData.length - statsResData.length,
      rows_without_ids: rowsWithoutIds,
      unique_player_game_pairs: seenKeys.size
    };

    // Store dedupe info in debugOut if provided
    if (debugOut) {
      const debugAny = debugOut as any;
      debugAny.dedupe_info = dedupeInfo;

      debugAny.experiment_info = {
        chunk_size: CHUNK_SIZE,
        pages_per_chunk: PAGES_PER_CHUNK,
        total_chunks: gameIdChunks.length,
        pages_fetched_total: totalPagesFetched,
        average_rows_per_game: gameIds.length > 0
          ? Math.round((statsResData.length / gameIds.length) * 10) / 10
          : 0,
        notes: "EXPERIMENT v5: chunk_size=10, 2 pages per chunk, all parallel"
      };
    }
  }

  if (debugOut) {
    debugOut.season_averages_count        = 0;
    debugOut.season_averages_empty_reason = null;
    debugOut.season_averages_error        = null;
    debugOut.stats_logs_count_total       = statsResData.length;
    debugOut.stats_error                  = statsUpstreamErr;
    if (gameIds.length > 0) {
      // Use type assertion to add game_window_size
      const debugAny = debugOut as any;
      debugAny.stats_fetch_params = {
        game_ids_count: gameIds.length,
        // season filter removed (game_ids-only query)
        chunk_count: Math.ceil(gameIds.length / CHUNK_SIZE),
        chunk_size: CHUNK_SIZE,
        game_window_size: gameIds.length
      };
      
      // dedupe_info is already added in the deduplication section above
    }
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

    // DEBUG: Add raw row analysis for Andrew Nembhard (player_id: 38017507)
    // Using type assertion to bypass TypeScript checking
    const debugAny = debugOut as any;
    const nembhardId = 38017507;
    
    // Always include nembhard_debug, even if just to say not found
    if (gameMap.has(nembhardId)) {
      const nembhardGames = gameMap.get(nembhardId)!;
      
      // Collect raw game IDs for this player's window
      const nembhardGameIds: number[] = [];
      const seenGameIds = new Set<number>();
      nembhardGames.forEach(g => {
        const gid = (g?.game as Record<string, unknown>)?.id as number ?? g?.game;
        if (gid && !seenGameIds.has(gid)) {
          seenGameIds.add(gid);
          nembhardGameIds.push(gid);
        }
      });
      
      // Analyze raw stat rows
      const rawRows = nembhardGames.slice(0, 10).map((g, idx) => ({
        row_index: idx,
        game_id: (g?.game as Record<string, unknown>)?.id as number ?? g?.game,
        game_date: gameDateMap.get((g?.game as Record<string, unknown>)?.id as number ?? g?.game) || 'unknown',
        player_id: g?.player?.id ?? g?.player_id,
        pts: g?.pts || 0,
        min: g?.min || '0:00',
        team: g?.team?.abbreviation || g?.team || 'unknown',
        opponent: g?.opponent?.abbreviation || g?.opponent || 'unknown'
      }));
      
      // Check for duplicates
      const uniqueByGameId = new Set(rawRows.map(r => r.game_id)).size;
      const totalRows = rawRows.length;
      
      // Build value arrays
      const allValsDebug = nembhardGames.map(g => gameVal(g, stat));
      const last5ValsDebug = allValsDebug.slice(0, 5).map(v => Math.round(v * 10) / 10);
      
      debugAny.nembhard_debug = {
        player_id: nembhardId,
        total_games_in_window: nembhardGames.length,
        unique_game_ids_count: uniqueByGameId,
        duplicate_analysis: {
          has_duplicate_game_ids: uniqueByGameId < totalRows,
          duplicate_count: totalRows - uniqueByGameId,
          duplicate_percentage: Math.round((1 - (uniqueByGameId / totalRows)) * 100)
        },
        raw_rows_sample: rawRows,
        value_arrays: {
          allVals_first10: allValsDebug.slice(0, 10),
          last5Vals: last5ValsDebug,
          all_identical: last5ValsDebug.length > 0 && last5ValsDebug.every(v => v === last5ValsDebug[0])
        },
        game_ids_in_window: nembhardGameIds.slice(0, 20)
      };
      
      // CRITICAL: Add console.log for Vercel logs - this doesn't change API structure
      console.log('🔍 NEMBHARD DEBUG - player_id:', nembhardId);
      console.log('🔍 NEMBHARD DEBUG - total_games_in_window:', nembhardGames.length);
      console.log('🔍 NEMBHARD DEBUG - raw_rows_sample (first 3):', rawRows.slice(0, 3));
      console.log('🔍 NEMBHARD DEBUG - allVals_first10:', allValsDebug.slice(0, 10));
      console.log('🔍 NEMBHARD DEBUG - last5Vals:', last5ValsDebug);
      console.log('🔍 NEMBHARD DEBUG - game_ids_in_window (first 10):', nembhardGameIds.slice(0, 10));
      console.log('🔍 NEMBHARD DEBUG - duplicate_analysis:', {
        has_duplicate_game_ids: uniqueByGameId < totalRows,
        duplicate_count: totalRows - uniqueByGameId,
        duplicate_percentage: Math.round((1 - (uniqueByGameId / totalRows)) * 100)
      });
    } else {
      // Nembhard not found in gameMap - include debug info about why
      debugAny.nembhard_debug = {
        player_id: nembhardId,
        found_in_gameMap: false,
        gameMap_size: gameMap.size,
        gameMap_keys_sample: Array.from(gameMap.keys()).slice(0, 5),
        possible_reasons: [
          "Not in active players list",
          "Filtered out by minutes (min_minutes=20)",
          "Not in stats results",
          "In different player_id format"
        ]
      };
      
      // Log to console
      console.log('🔍 NEMBHARD DEBUG - NOT FOUND in gameMap');
      console.log('🔍 NEMBHARD DEBUG - gameMap_size:', gameMap.size);
      console.log('🔍 NEMBHARD DEBUG - gameMap_keys_sample:', Array.from(gameMap.keys()).slice(0, 5));
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

    // Calculate confidence score (v2: trust in edge signal)
    const { confidence, confidence_tier } = computeConfidenceV2(
      allVals,
      last5Vals,
      seasonAvg,
      recentAvg,
      games.length,
    );

    // Edge strength + play score (additive — does not modify existing logic)
    const { edge_score, edge_tier } = getEdgeStrength(delta);
    const play_score = calculatePlayScore(edge_score, confidence);
    const play_tier = getPlayTier(play_score);
    const direction = getDirection(delta);

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
      confidence_tier,
      edge_score,
      edge_tier,
      play_score,
      play_tier,
      direction,
    });
  }

  if (debugOut) {
    debugOut.final_candidates_before_sort = entries.length;
    const debugAny = debugOut as any;
    // Experiment v2 metrics: data depth
    const allGameCounts = [...gameMap.values()].map(gs => gs.length);
    debugAny.max_games_any_player = allGameCounts.length > 0 ? Math.max(...allGameCounts) : 0;
    debugAny.count_players_with_nonzero_delta = entries.filter(e => e.delta !== 0).length;
    debugAny.count_players_with_zero_delta = entries.filter(e => e.delta === 0).length;
  }

  // Sort by best playable signal: play_score → confidence → |delta|
  entries.sort((a, b) => {
    const ps = (b.play_score ?? 0) - (a.play_score ?? 0);
    if (ps !== 0) return ps;
    const cf = (b.confidence ?? 0) - (a.confidence ?? 0);
    if (cf !== 0) return cf;
    return Math.abs(b.delta) - Math.abs(a.delta);
  });
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
