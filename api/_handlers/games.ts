/**
 * games.ts handler — GET /api/games
 * Returns upcoming games (next 3 days, non-final only)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AdapterFactory } from '../_adapters/AdapterFactory.js';

export async function gamesHandler(req: VercelRequest, res: VercelResponse) {
  // Get league from query parameter, default to 'nba'
  const league = ((req.query.league as string) || 'nba').toLowerCase();
  if (!['nba', 'wnba'].includes(league)) {
    return res.status(400).json({ error: 'Invalid league. Must be "nba" or "wnba"' });
  }

  try {
    const adapter = AdapterFactory.get(league);
    const games = await adapter.games();
    res.json({ data: games });
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = err as any;
    const status = e?.response?.status;
    console.error('[games] error:', e?.message, 'HTTP status:', status);
    res.status(500).json({ error: 'Failed to fetch games', detail: String(err), bdlStatus: status });
  }
}
