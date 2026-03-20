import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib.js';
import { playersHandler } from '../_handlers/players.js';
import { playerStatsHandler } from '../_handlers/player-stats.js';
import { playerPhotoHandler } from '../_handlers/player-photo.js';
import { compareHandler } from '../_handlers/compare.js';

/**
 * Catch-all handler for /api/players/** routes.
 *
 *   GET /api/players?search=<name>         → search
 *   GET /api/players/:id/stats             → season averages
 *   GET /api/players/photo                 → player headshot
 *   GET /api/players/compare/:id1/:id2     → side-by-side comparison
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const pathname = url.pathname;

  // /api/players/photo
  if (pathname === '/api/players/photo') {
    return playerPhotoHandler(req, res);
  }

  // /api/players/compare/:id1/:id2
  const compareMatch = pathname.match(/^\/api\/players\/compare\/(\d+)\/(\d+)$/);
  if (compareMatch) {
    return compareHandler(req, res, compareMatch[1], compareMatch[2]);
  }

  // /api/players/:id/stats
  const statsMatch = pathname.match(/^\/api\/players\/(\d+)\/stats$/);
  if (statsMatch) {
    return playerStatsHandler(req, res, statsMatch[1]);
  }

  // Default: /api/players?search=<name>
  return playersHandler(req, res);
}
