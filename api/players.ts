import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib.js';
import { AdapterFactory } from './_adapters/AdapterFactory.js';

// Players search endpoint
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const search = (req.query.search as string) || '';
  if (!search) return res.status(400).json({ error: 'search query param is required' });

  // Get league from query parameter, default to 'nba'
  const league = ((req.query.league as string) || 'nba').toLowerCase();
  if (!['nba', 'wnba'].includes(league)) {
    return res.status(400).json({ error: 'Invalid league. Must be "nba" or "wnba"' });
  }

  try {
    const result = await AdapterFactory.get(league).playerSearch(search);
    res.json(result);
  } catch (err) {
    console.error('[players] error:', err);
    res.status(500).json({ error: 'Failed to fetch players', detail: String(err) });
  }
}
