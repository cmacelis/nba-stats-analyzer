/**
 * compare.ts handler — GET /api/players/compare/:id1/:id2
 * Compare two players' season averages
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BDL_SEASON } from '../_lib.js';
import { AdapterFactory } from '../_adapters/AdapterFactory.js';

export async function compareHandler(req: VercelRequest, res: VercelResponse, id1: string, id2: string) {
  const season = parseInt(req.query.season as string) || BDL_SEASON;
  
  // Get league from query parameter, default to 'nba'
  const league = ((req.query.league as string) || 'nba').toLowerCase();
  if (!['nba', 'wnba'].includes(league)) {
    return res.status(400).json({ error: 'Invalid league. Must be "nba" or "wnba"' });
  }

  try {
    const result = await AdapterFactory.get(league).compare(parseInt(id1), parseInt(id2), season);
    res.json(result);
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = err as any;
    if (e?.response?.status === 401) {
      return res.status(402).json({ error: 'plan_required', message: 'Season stats require a BallDontLie Starter plan.' });
    }
    console.error('[compare] error:', e?.message);
    res.status(500).json({ error: 'Failed to fetch comparison data' });
  }
}
