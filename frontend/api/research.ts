import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib.js';

// Import handlers
import { researchHandler } from './_handlers/research.js';
import { generateHandler } from './_handlers/generate.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  const url = new URL(req.url || '', 'http://localhost');
  const pathname = url.pathname;

  try {
    // Route: POST /api/research/generate
    if (pathname === '/api/research/generate' && req.method === 'POST') {
      return generateHandler(req, res);
    }

    // Route: GET /api/research/:playerName?prop=...
    const researchMatch = pathname.match(/^\/api\/research\/(.+)$/);
    if (researchMatch && req.method === 'GET') {
      const [, playerName] = researchMatch;
      return researchHandler(req, res, decodeURIComponent(playerName));
    }

    // No match
    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    console.error('[research] error:', (err as Error).message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
