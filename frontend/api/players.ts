import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib.js';
import { AdapterFactory } from './_adapters/AdapterFactory.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  
  const search = (req.query.search as string) || '';
  if (!search) return res.status(400).json({ error: 'search query param required' });
  
  try {
    const result = await AdapterFactory.get('nba').playerSearch(search);
    return res.json(result);
  } catch (err) {
    console.error('[api/players]', err);
    return res.status(500).json({ error: 'Internal server error', detail: String(err) });
  }
}
