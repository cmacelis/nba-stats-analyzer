import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib.js';
import { nbaPlayerSearchHandler } from './handlers/nba/players.js';
import { playerStatsHandler } from './_handlers/player-stats.js';
import { playerPhotoHandler } from './_handlers/player-photo.js';
import { compareHandler } from './_handlers/compare.js';
import { gamesHandler } from './_handlers/games.js';
import predictHandler from './_handlers/predict.js';
import { researchHandler } from './_handlers/research.js';
import { generateHandler } from './_handlers/generate.js';

/**
 * /api/players — unified handler with _subpath routing for sub-routes.
 *
 * Vercel only routes exact /api/players here. Sub-paths like
 * /api/players/115/stats are handled by the SPA 404.html fallback and
 * never reach this function. So the frontend must use _subpath param:
 *
 *   GET /api/players?search=<name>[&league=nba|wnba]        → player search
 *   GET /api/players?_subpath=<id>/stats&season=2025        → season averages
 *   GET /api/players?_subpath=photo&name=<name>             → player headshot
 *   GET /api/players?_subpath=compare/<id1>/<id2>&season=   → comparison
 *
 * League parameter support:
 * - league=nba (default): Returns NBA players via BallDontLie API
 * - league=wnba: Returns WNBA players (when implemented) - currently returns NBA players
 *                due to BDL API limitation. WNBA support is a separate backlog item.
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
    // Base route: /api/players?search=<name>[&league=nba|wnba]
    return nbaPlayerSearchHandler(req, res);
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

  // games - game data
  if (effectivePath === 'games') {
    return gamesHandler(req, res);
  }

  // predict - predictions
  if (effectivePath === 'predict') {
    return predictHandler(req, res);
  }

  // research - research data
  if (effectivePath.startsWith('research/')) {
    const playerName = effectivePath.replace('research/', '');
    return researchHandler(req, res, playerName);
  }

  // research/generate - AI generation
  if (effectivePath === 'research/generate') {
    const method = req.method as string;
    if (method === 'POST') {
      return generateHandler(req, res);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Fallback: treat as search
  return nbaPlayerSearchHandler(req, res);
}
