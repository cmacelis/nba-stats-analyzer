/**
 * player-stats.ts handler — GET /api/players/:id/stats
 * Get season averages for a player
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSeasonAverages, BDL_SEASON } from '../_lib.js';

export async function playerStatsHandler(req: VercelRequest, res: VercelResponse, id: string) {
  const season = parseInt(req.query.season as string) || BDL_SEASON;

  try {
    const data = await getSeasonAverages(parseInt(id), season);
    res.json(data ?? {});
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = err as any;
    if (e?.response?.status === 401) {
      return res.status(402).json({ error: 'plan_required', message: 'Season stats require a BallDontLie Starter plan.' });
    }
    console.error('[player-stats] error:', e?.message);
    res.status(500).json({ error: 'Failed to fetch player stats' });
  }
}
