import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib.js';
import { AdapterFactory } from './_adapters/AdapterFactory.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const league = (req as any).league || 'nba';
    const games = await AdapterFactory.get(league).games();
    return res.json({ data: games });
  } catch (err) {
    console.error('[api/games]', err);
    return res.status(500).json({ error: 'Internal server error', detail: String(err) });
  }
}
