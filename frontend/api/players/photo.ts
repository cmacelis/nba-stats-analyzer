import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, findNbaPersonId, buildNbaPhotoUrl } from '../_lib.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
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
