/**
 * research.ts — consolidated serverless function for all /api/research/* routes.
 *
 * Vercel rewrites /api/research/(.*) → /api/research?_subpath=$1
 *
 * Routes:
 *   GET  /api/research/:playerName?prop= → researchHandler
 *   POST /api/research/generate          → generateHandler
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib.js';
import { researchHandler } from './_handlers/research.js';
import { generateHandler } from './_handlers/generate.js';

/** Extract subpath from _subpath query param OR from req.url as fallback. */
function getSubpath(req: VercelRequest): string {
  const qs = req.query._subpath;
  if (qs) return Array.isArray(qs) ? qs.join('/') : qs;

  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const prefix = '/api/research/';
  if (url.pathname.startsWith(prefix)) {
    return url.pathname.slice(prefix.length);
  }
  return '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  const subpath = getSubpath(req);
  const method = req.method || 'GET';

  if (req.query.debug === '1') {
    console.log('[research] method=%s subpath=%s url=%s', method, subpath, req.url);
  }

  try {
    // POST /api/research/generate
    if (subpath === 'generate') {
      if (method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      return await generateHandler(req, res);
    }

    // GET /api/research/:playerName
    if (method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    if (!subpath) return res.status(400).json({ error: 'playerName required' });

    return await researchHandler(req, res, decodeURIComponent(subpath));
  } catch (err) {
    console.error('[research] unhandled error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error', detail: String(err) });
    }
  }
}
