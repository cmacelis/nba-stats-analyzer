import type { VercelRequest, VercelResponse } from '@vercel/node';
import { compareHandler } from '../../../_handlers/compare.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const id1 = (req.query.id1 as string) || '';
  const id2 = (req.query.id2 as string) || '';
  if (!id1 || !id2) return res.status(400).json({ error: 'id1 and id2 required' });
  return compareHandler(req, res, id1, id2);
}
