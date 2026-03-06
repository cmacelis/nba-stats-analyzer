import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib.js';
import { playerPhotoHandler } from '../_handlers/player-photo.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    return playerPhotoHandler(req, res);
  } catch (err) {
    console.error('[photo] error:', (err as Error).message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
