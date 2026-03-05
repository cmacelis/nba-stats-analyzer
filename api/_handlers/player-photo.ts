/**
 * player-photo.ts handler — GET /api/players/photo?name=...
 * Get photo URL for a player by name
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { findNbaPersonId, buildNbaPhotoUrl } from '../_lib.js';

export async function playerPhotoHandler(req: VercelRequest, res: VercelResponse) {
  const name = req.query.name as string;
  if (!name) return res.status(400).json({ error: 'name param required' });
  try {
    const personId = await findNbaPersonId(name);
    res.json({ photo_url: personId != null ? buildNbaPhotoUrl(personId) : null });
  } catch (err) {
    console.error('[photo] error:', (err as Error).message);
    res.json({ photo_url: null });
  }
}
