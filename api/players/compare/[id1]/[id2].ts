import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../../_lib.js';
import { AdapterFactory } from '../../../_adapters/AdapterFactory.js';
import { BDL_SEASON } from '../../../_lib.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  
  const id1 = (req.query.id1 as string) || '';
  const id2 = (req.query.id2 as string) || '';
  if (!id1 || !id2) return res.status(400).json({ error: 'id1 and id2 required' });
  
  const season = parseInt(req.query.season as string) || BDL_SEASON;

  try {
    const result = await AdapterFactory.get('nba').compare(parseInt(id1), parseInt(id2), season);
    res.json(result);
  } catch (err) {
    const e = err as any;
    if (e?.response?.status === 401) {
      return res.status(402).json({ error: 'plan_required', message: 'Season stats require a BallDontLie Starter plan.' });
    }
    console.error('[compare] error:', e?.message);
    res.status(500).json({ error: 'Failed to fetch comparison data' });
  }
}
