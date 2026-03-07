/**
 * players.ts handler — GET /api/players?search=...
 * Player search with photo enrichment
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AdapterFactory } from '../_adapters/AdapterFactory.js';

export async function playersHandler(req: VercelRequest, res: VercelResponse) {
  try {
    const search = (req.query.search as string) || '';
    if (!search) return res.status(400).json({ error: 'search query param is required' });

    const league = (req.query.league as string) || 'nba';
    const adapter = AdapterFactory.get(league);
    const result = await adapter.playerSearch(search);
    
    res.json(result);
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = err as any;
    if (e?.response?.status === 401) {
      return res.status(402).json({ error: 'plan_required', message: 'Player search requires a valid BallDontLie API key.' });
    }
    console.error('[players] error:', e?.message);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to fetch player data', detail: String(err) });
  }
}
