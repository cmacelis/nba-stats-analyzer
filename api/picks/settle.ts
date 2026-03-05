import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib.js';
import { picksSettleHandler } from '../_handlers/picks-settle.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  return picksSettleHandler(req, res);
}
