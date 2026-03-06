import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib.js';

// Import all handlers
import { playersHandler } from './_handlers/players.js';
import { playerPhotoHandler } from './_handlers/player-photo.js';
import { compareHandler } from './_handlers/compare.js';
import { researchHandler } from './_handlers/research.js';
import { generateHandler } from './_handlers/generate.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  // Get the path segments - req.query.path is an array of segments after /api/
  const pathSegments = Array.isArray(req.query.path) ? req.query.path : (req.query.path ? [req.query.path] : []);
  const fullPath = pathSegments.join('/');
  
  try {
    // Route: GET /api/players?search=...
    if (fullPath === 'players' && req.method === 'GET') {
      return playersHandler(req, res);
    }

    // Route: GET /api/players/photo?name=...
    if (fullPath === 'players/photo' && req.method === 'GET') {
      return playerPhotoHandler(req, res);
    }

    // Route: GET /api/players/compare/:id1/:id2?season=...
    const compareMatch = fullPath.match(/^players\/compare\/(\d+)\/(\d+)$/);
    if (compareMatch && req.method === 'GET') {
      const [, id1, id2] = compareMatch;
      return compareHandler(req, res, id1, id2);
    }

    // Route: POST /api/research/generate
    if (fullPath === 'research/generate' && req.method === 'POST') {
      return generateHandler(req, res);
    }

    // Route: GET /api/research/:playerName?prop=...
    const researchMatch = fullPath.match(/^research\/(.+)$/);
    if (researchMatch && req.method === 'GET') {
      const [, playerName] = researchMatch;
      return researchHandler(req, res, decodeURIComponent(playerName));
    }

    // No match - 404
    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    console.error('[...path] error:', (err as Error).message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
