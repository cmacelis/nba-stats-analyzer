import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib.js';
import { playerPhotoHandler } from '../_handlers/player-photo.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  
  const name = (req.query.name as string) || '';
  if (!name) return res.status(400).json({ error: 'name query param required' });
  
  return playerPhotoHandler(req, res);
}
