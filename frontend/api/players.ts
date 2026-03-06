/**
 * players.ts — consolidated serverless function for all /api/players/* routes.
 *
 * Vercel rewrites /api/players/(.*) → /api/players?_subpath=$1
 * Direct hits to /api/players arrive with no _subpath.
 *
 * Routes:
 *   GET  /api/players?search=           → playersHandler
 *   GET  /api/players/photo?name=       → playerPhotoHandler (with timeout guard)
 *   GET  /api/players/compare/:id1/:id2 → compareHandler
 *   GET  /api/players/:id/stats         → playerStatsHandler
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib.js';
import { playersHandler } from './_handlers/players.js';
import { playerPhotoHandler } from './_handlers/player-photo.js';
import { compareHandler } from './_handlers/compare.js';
import { playerStatsHandler } from './_handlers/player-stats.js';

const PHOTO_TIMEOUT_MS = 2000;

/** Extract subpath from _subpath query param OR from req.url as fallback. */
function getSubpath(req: VercelRequest): string {
  const qs = req.query._subpath;
  if (qs) return Array.isArray(qs) ? qs.join('/') : qs;

  // Fallback: parse pathname directly (handles case where rewrite didn't inject _subpath)
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const prefix = '/api/players/';
  if (url.pathname.startsWith(prefix)) {
    return url.pathname.slice(prefix.length);
  }
  return '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const subpath = getSubpath(req);

  if (req.query.debug === '1') {
    console.log('[players] method=%s subpath=%s url=%s', req.method, subpath, req.url);
  }

  try {
    // GET /api/players/photo?name=
    if (subpath === 'photo') {
      // Guard against NBA Stats API hanging — return graceful null on timeout
      const timer = new Promise<void>(resolve =>
        setTimeout(() => {
          if (!res.headersSent) {
            const name = (req.query.name as string) || '';
            res.json({ name, nba_person_id: null, photo_url: null });
          }
          resolve();
        }, PHOTO_TIMEOUT_MS),
      );
      await Promise.race([playerPhotoHandler(req, res), timer]);
      return;
    }

    // GET /api/players/compare/:id1/:id2
    const compareMatch = subpath.match(/^compare\/(\d+)\/(\d+)$/);
    if (compareMatch) {
      return await compareHandler(req, res, compareMatch[1], compareMatch[2]);
    }

    // GET /api/players/:id/stats
    const statsMatch = subpath.match(/^(\d+)\/stats$/);
    if (statsMatch) {
      return await playerStatsHandler(req, res, statsMatch[1]);
    }

    // GET /api/players?search= (base path — no subpath)
    if (!subpath) {
      return await playersHandler(req, res);
    }

    return res.status(404).json({ error: 'Not found', subpath });
  } catch (err) {
    console.error('[players] unhandled error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
