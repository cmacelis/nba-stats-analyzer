import type { VercelRequest, VercelResponse } from '@vercel/node';
import { researchHandler } from '../../_handlers/research.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const playerName = (req.query.playerName as string) || '';
  if (!playerName) return res.status(400).json({ error: 'playerName required' });
  return researchHandler(req, res, playerName);
}
