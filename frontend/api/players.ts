import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib.js';
import { playersHandler } from './_handlers/players.js';
import { playerStatsHandler } from './_handlers/player-stats.js';
import { playerPhotoHandler } from './_handlers/player-photo.js';
import { compareHandler } from './_handlers/compare.js';

/**
 * /api/players — unified handler with _subpath routing for sub-routes.
 *
 * Vercel only routes exact /api/players here. Sub-paths like
 * /api/players/115/stats are handled by the SPA 404.html fallback and
 * never reach this function. So the frontend must use _subpath param:
 *
 *   GET /api/players?search=<name>                          → search
 *   GET /api/players?_subpath=<id>/stats&season=2025        → season averages
 *   GET /api/players?_subpath=photo&name=<name>             → player headshot
 *   GET /api/players?_subpath=compare/<id1>/<id2>&season=   → comparison
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Check for _subpath routing (used for sub-routes)
  const subpath = (req.query._subpath as string) || '';

  // Also check the actual URL path for direct hits (when catch-all routing works)
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const pathname = url.pathname;
  const effectivePath = subpath || pathname.replace(/^\/api\/players\/?/, '');

  if (!effectivePath || effectivePath === '') {
    // Base route: /api/players?search=<name>
    return playersHandler(req, res);
  }

  // photo
  if (effectivePath === 'photo') {
    return playerPhotoHandler(req, res);
  }

  // compare/:id1/:id2
  const compareMatch = effectivePath.match(/^compare\/(\d+)\/(\d+)$/);
  if (compareMatch) {
    return compareHandler(req, res, compareMatch[1], compareMatch[2]);
  }

  // :id/stats
  const statsMatch = effectivePath.match(/^(\d+)\/stats$/);
  if (statsMatch) {
    return playerStatsHandler(req, res, statsMatch[1]);
  }

  // Fallback: treat as search
  return playersHandler(req, res);
}
