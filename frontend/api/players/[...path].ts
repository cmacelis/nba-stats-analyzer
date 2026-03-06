import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib.js';

// Import handlers
import { playersHandler } from '../_handlers/players.js';
import { playerPhotoHandler } from '../_handlers/player-photo.js';
import { compareHandler } from '../_handlers/compare.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  // Get the path segments from the [...path] catch-all
  const pathSegments = Array.isArray(req.query.path) ? req.query.path : (req.query.path ? [req.query.path] : []);
  
  try {
    // Root: GET /api/players?search=...
    if (pathSegments.length === 0 && req.method === 'GET') {
      return playersHandler(req, res);
    }

    // /api/players/photo?name=...
    if (pathSegments.length === 1 && pathSegments[0] === 'photo' && req.method === 'GET') {
      return playerPhotoHandler(req, res);
    }

    // /api/players/compare/:id1/:id2?season=...
    if (
      pathSegments.length === 3 &&
      pathSegments[0] === 'compare' &&
      /^\d+$/.test(pathSegments[1]) &&
      /^\d+$/.test(pathSegments[2]) &&
      req.method === 'GET'
    ) {
      const [, id1, id2] = pathSegments;
      return compareHandler(req, res, id1, id2);
    }

    // No match
    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    console.error('[players] error:', (err as Error).message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
