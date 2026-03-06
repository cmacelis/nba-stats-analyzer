import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib.js';

// Import handlers
import { playersHandler } from './_handlers/players.js';
import { playerPhotoHandler } from './_handlers/player-photo.js';
import { compareHandler } from './_handlers/compare.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  // Parse URL to determine which sub-route
  const url = new URL(req.url || '', 'http://localhost');
  const pathname = url.pathname;

  try {
    // Route: GET /api/players?search=...
    if (pathname === '/api/players' && req.method === 'GET') {
      return playersHandler(req, res);
    }

    // Route: GET /api/players/photo?name=...
    if (pathname === '/api/players/photo' && req.method === 'GET') {
      return playerPhotoHandler(req, res);
    }

    // Route: GET /api/players/compare/:id1/:id2?season=...
    const compareMatch = pathname.match(/^\/api\/players\/compare\/(\d+)\/(\d+)$/);
    if (compareMatch && req.method === 'GET') {
      const [, id1, id2] = compareMatch;
      return compareHandler(req, res, id1, id2);
    }

    // No match
    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    console.error('[players] error:', (err as Error).message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
