import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib.js';
import { generateHandler } from '../_handlers/generate.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    return generateHandler(req, res);
  } catch (err) {
    console.error('[research/generate] error:', (err as Error).message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
