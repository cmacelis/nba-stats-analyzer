/**
 * _router.ts — unified serverless function for all consolidated endpoints.
 *
 * This single function routes to handlers based on the request path, reducing
 * Vercel Hobby function count from 14 to 5 (keeping health, edge, picks, alerts separate).
 *
 * Consolidated routes:
 *   GET  /api/games                      → gamesHandler
 *   GET  /api/players                    → playersHandler (search)
 *   GET  /api/players/:id/stats          → playerStatsHandler
 *   GET  /api/players/photo              → playerPhotoHandler
 *   GET  /api/players/compare/:id1/:id2  → compareHandler
 *   GET  /api/research/:playerName       → researchHandler
 *   POST /api/research/generate          → generateHandler
 *   GET  /api/discord/help               → discordHelpHandler
 *   GET  /api/discord/today              → discordTodayHandler
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib.js';
import { gamesHandler } from './_handlers/games.js';
import { playersHandler } from './_handlers/players.js';
import { playerStatsHandler } from './_handlers/player-stats.js';
import { playerPhotoHandler } from './_handlers/player-photo.js';
import { compareHandler } from './_handlers/compare.js';
import { researchHandler } from './_handlers/research.js';
import { generateHandler } from './_handlers/generate.js';
import { discordHelpHandler } from './_handlers/discord-help.js';
import { discordTodayHandler } from './_handlers/discord-today.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply CORS
  if (applyCors(req, res)) return;

  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method || 'GET';

  try {
    // Route based on path pattern
    if (pathname === '/api/games') {
      return await gamesHandler(req, res);
    }

    if (pathname === '/api/players') {
      return await playersHandler(req, res);
    }

    if (pathname === '/api/players/photo') {
      return await playerPhotoHandler(req, res);
    }

    // /api/players/:id/stats
    const playerStatsMatch = pathname.match(/^\/api\/players\/(\d+)\/stats$/);
    if (playerStatsMatch) {
      return await playerStatsHandler(req, res, playerStatsMatch[1]);
    }

    // /api/players/compare/:id1/:id2
    const compareMatch = pathname.match(/^\/api\/players\/compare\/(\d+)\/(\d+)$/);
    if (compareMatch) {
      return await compareHandler(req, res, compareMatch[1], compareMatch[2]);
    }

    // /api/research/:playerName (generate takes POST)
    if (pathname.startsWith('/api/research/')) {
      const segment = pathname.slice('/api/research/'.length);
      if (segment === 'generate') {
        if (method === 'POST') {
          return await generateHandler(req, res);
        } else {
          return res.status(405).json({ error: 'Method not allowed' });
        }
      }
      // Otherwise it's /api/research/:playerName
      return await researchHandler(req, res, segment);
    }

    // /api/discord/help
    if (pathname === '/api/discord/help') {
      return await discordHelpHandler(req, res);
    }

    // /api/discord/today
    if (pathname === '/api/discord/today') {
      return await discordTodayHandler(req, res);
    }

    // No match
    res.status(404).json({ error: 'Not found' });
  } catch (err) {
    console.error('[_router] unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
