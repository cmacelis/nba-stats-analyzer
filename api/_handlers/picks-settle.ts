/**
 * picks-settle.ts handler — POST /api/picks/settle
 *
 * Settles unsettled bets by:
 *   1. Loading all picks in the lookback window
 *   2. Filtering to type=bet with no result yet
 *   3. Fetching BDL game logs per player from the pick date forward
 *   4. Matching each pick to its next game, computing actual stat + W/L/P
 *   5. Writing the updated pick back to KV
 *
 * Query params:
 *   lookback_days  (default 3) — how many days back to look for unsettled bets
 *
 * Returns: { checked, settled, skipped, errors }
 *   checked  — total unsettled bets found
 *   settled  — picks successfully resolved this run
 *   skipped  — picks with no matching game yet (game hasn't happened)
 *   errors   — picks that failed due to API / KV errors
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { bdlGet, BDL_SEASON } from '../_lib.js';
import { type Pick, KV_OK, listPicks, updatePick } from '../picks.js';

// ── helpers ───────────────────────────────────────────────────────────────────

function computeActual(log: Record<string, unknown>, stat: Pick['stat']): number {
  const pts = Number(log.pts) || 0;
  const reb = Number(log.reb) || 0;
  const ast = Number(log.ast) || 0;
  if (stat === 'pra') return pts + reb + ast;
  if (stat === 'pts') return pts;
  if (stat === 'reb') return reb;
  if (stat === 'ast') return ast;
  return 0;
}

function determineResult(actual: number, line: number, direction: 'over' | 'under'): 'W' | 'L' | 'P' {
  if (actual === line) return 'P';
  if (direction === 'over') return actual > line ? 'W' : 'L';
  return actual < line ? 'W' : 'L';
}

function parseMins(min: string | number): number {
  if (typeof min === 'number') return min;
  const parts = String(min || '0').split(':');
  return parseInt(parts[0]) + (parseInt(parts[1] || '0') / 60);
}

// ── handler ───────────────────────────────────────────────────────────────────

export async function picksSettleHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!KV_OK) return res.status(400).json({ error: 'KV not configured' });

  const lookbackDays = Math.min(parseInt(req.query.lookback_days as string) || 3, 14);
  const since = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;

  let allPicks: Pick[];
  try {
    allPicks = await listPicks(since);
  } catch (err) {
    console.error('[picks-settle] list error:', (err as Error).message);
    return res.status(500).json({ error: 'Failed to fetch picks', detail: (err as Error).message });
  }

  // Only unsettled bets with a line
  const unsettled = allPicks.filter(
    p => p.type === 'bet' && p.result == null && p.line != null
  );

  if (unsettled.length === 0) {
    return res.json({ checked: 0, settled: 0, skipped: 0, errors: 0 });
  }

  // Group by player_id to batch BDL calls
  const byPlayer = new Map<number, Pick[]>();
  for (const pick of unsettled) {
    const list = byPlayer.get(pick.player_id) ?? [];
    list.push(pick);
    byPlayer.set(pick.player_id, list);
  }

  let settled = 0, skipped = 0, errors = 0;

  for (const [playerId, picks] of byPlayer) {
    try {
      // Use the earliest pick date for this player as our start_date
      const earliestDate = picks
        .map(p => p.created_at.slice(0, 10))
        .sort()[0];

      // Fetch game logs from that date forward (ascending so earliest game first)
      const data = await bdlGet('/stats', {
        'player_ids[]': playerId,
        'seasons[]':    BDL_SEASON,
        per_page:       30,
        sort:           'date',
        direction:      'asc',
        start_date:     earliestDate,
      });

      const logs: Array<Record<string, unknown>> = (data?.data ?? [])
        .filter((g: Record<string, unknown>) => parseMins(g.min as string | number) >= 5);

      for (const pick of picks) {
        const pickDate = pick.created_at.slice(0, 10);

        // First game on or after the pick date
        const gameLog = logs.find(log => {
          const gameDate = (log.game as Record<string, unknown>)?.date as string | undefined;
          return gameDate && gameDate >= pickDate;
        });

        if (!gameLog) {
          skipped++;
          continue;
        }

        const actual       = computeActual(gameLog, pick.stat);
        const result       = determineResult(actual, pick.line!, pick.direction);
        const gameDate     = (gameLog.game as Record<string, unknown>)?.date as string;

        const updated: Pick = {
          ...pick,
          actual,
          result,
          settled_at:        new Date().toISOString(),
          settled_game_date: gameDate,
        };

        await updatePick(updated);
        settled++;
      }
    } catch (err) {
      console.error(`[picks-settle] player ${playerId} error:`, (err as Error).message);
      errors += picks.length;
    }
  }

  console.log(`[picks-settle] checked=${unsettled.length} settled=${settled} skipped=${skipped} errors=${errors}`);
  return res.json({ checked: unsettled.length, settled, skipped, errors });
}
