import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../_lib.js';
import { researchHandler } from '../../_handlers/research.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  
  const { playerName } = req.query as { playerName: string };
  if (!playerName) return res.status(400).json({ error: 'playerName is required' });
  
  return researchHandler(req, res, playerName);
}
