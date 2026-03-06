import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../_lib.js';
import { researchHandler } from '../../_handlers/research.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const playerName = (req.query.playerName as string) || '';
  if (!playerName) return res.status(400).json({ error: 'playerName required' });

  try {
    return researchHandler(req, res, playerName);
  } catch (err) {
    console.error('[research] error:', (err as Error).message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
