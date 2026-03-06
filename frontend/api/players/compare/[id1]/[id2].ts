import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../../_lib.js';
import { compareHandler } from '../../../_handlers/compare.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const id1 = (req.query.id1 as string) || '';
  const id2 = (req.query.id2 as string) || '';
  if (!id1 || !id2) return res.status(400).json({ error: 'id1 and id2 required' });

  try {
    return compareHandler(req, res, id1, id2);
  } catch (err) {
    console.error('[compare] error:', (err as Error).message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
