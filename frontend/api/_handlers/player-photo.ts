/**
 * player-photo.ts handler — GET /api/players/photo?name=...
 * Get photo URL for a player by name
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AdapterFactory } from '../_adapters/AdapterFactory.js';

export async function playerPhotoHandler(req: VercelRequest, res: VercelResponse) {
  const name = req.query.name as string;
  if (!name) return res.status(400).json({ error: 'name param required' });
  try {
    const league = (req as any).league || 'nba';
    const photo_url = await AdapterFactory.get(league).photo(name);
    res.json({ photo_url });
  } catch (err) {
    console.error('[photo] error:', (err as Error).message);
    res.json({ photo_url: null });
  }
}
