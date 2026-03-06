import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib.js';

// Import handlers
import { researchHandler } from '../_handlers/research.js';
import { generateHandler } from '../_handlers/generate.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  // Get the path segments from the [...path] catch-all
  const pathSegments = Array.isArray(req.query.path) ? req.query.path : (req.query.path ? [req.query.path] : []);

  try {
    // POST /api/research/generate
    if (pathSegments.length === 1 && pathSegments[0] === 'generate' && req.method === 'POST') {
      return generateHandler(req, res);
    }

    // GET /api/research/:playerName?prop=...
    if (pathSegments.length === 1 && req.method === 'GET') {
      const playerName = decodeURIComponent(pathSegments[0]);
      return researchHandler(req, res, playerName);
    }

    // No match
    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    console.error('[research] error:', (err as Error).message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
