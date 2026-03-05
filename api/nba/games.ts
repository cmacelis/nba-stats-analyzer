/**
 * GET /api/nba/games
 *
 * League-aware alias for /api/games.
 * Returns { data: Game[] } — upcoming/in-progress games, next 3 days, non-final only.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib.js';
import { AdapterFactory } from '../_adapters/AdapterFactory.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const games = await AdapterFactory.get('nba').games();
    res.json({ data: games });
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = err as any;
    const status = e?.response?.status;
    console.error('[nba/games] error:', e?.message, 'HTTP status:', status);
    res.status(500).json({ error: 'Failed to fetch games', detail: String(err), bdlStatus: status });
  }
}
