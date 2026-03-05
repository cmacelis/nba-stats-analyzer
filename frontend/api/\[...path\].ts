/**
 * CATCH-ALL ROUTER — Consolidates 15+ individual routes into ONE serverless function
 * Handles: /api/players, /api/games, /api/research, /api/nba/*, etc.
 * Goal: Reduce function count from 21 → 7 (under Hobby limit)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib.js';
import { AdapterFactory } from './_adapters/AdapterFactory.js';
import { playerPhotoHandler } from './_handlers/player-photo.js';
import { compareHandler } from './_handlers/compare.js';
import { researchHandler } from './_handlers/research.js';
import { generateHandler } from './_handlers/generate.js';

async function routerHandler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  // Extract the path (everything after /api/)
  const path = (req.query.path as string[])?.join('/') || '';
  const method = req.method;

  // Detect league (nba, wnba, etc.) from path prefix
  let league = 'nba';
  let cleanPath = path;
  if (path.startsWith('nba/')) {
    league = 'nba';
    cleanPath = path.replace('nba/', '');
  } else if (path.startsWith('wnba/')) {
    league = 'wnba';
    cleanPath = path.replace('wnba/', '');
  }

  try {
    // ===== PLAYERS ROUTES =====

    // GET /api/players?search=...
    if (cleanPath === 'players' && method === 'GET') {
      const search = (req.query.search as string) || '';
      if (!search) return res.status(400).json({ error: 'search query param required' });
      const result = await AdapterFactory.get(league).playerSearch(search);
      return res.json(result);
    }

    // GET /api/players/photo?name=...
    if (cleanPath === 'players/photo' && method === 'GET') {
      const name = (req.query.name as string) || '';
      if (!name) return res.status(400).json({ error: 'name query param required' });
      // Create mock req/res for playerPhotoHandler
      return playerPhotoHandler(req, res);
    }

    // GET /api/players/compare/:id1/:id2
    if (cleanPath.match(/^players\/compare\/\d+\/\d+$/) && method === 'GET') {
      const match = cleanPath.match(/^players\/compare\/(\d+)\/(\d+)$/);
      if (match) {
        const [, id1, id2] = match;
        return compareHandler(req, res, id1, id2);
      }
    }

    // ===== GAMES ROUTE =====

    // GET /api/games
    if (cleanPath === 'games' && method === 'GET') {
      const result = await AdapterFactory.get(league).getGames();
      return res.json(result);
    }

    // ===== RESEARCH ROUTES =====

    // GET /api/research/:playerName
    if (cleanPath.match(/^research\/[\w\s-]+$/) && method === 'GET') {
      const match = cleanPath.match(/^research\/(.+)$/);
      if (match) {
        const [, playerName] = match;
        return researchHandler(req, res, decodeURIComponent(playerName));
      }
    }

    // POST /api/research/generate
    if (cleanPath === 'research/generate' && method === 'POST') {
      return generateHandler(req, res);
    }

    // ===== EDGE ROUTE =====

    // GET /api/edge
    if (cleanPath === 'edge' && method === 'GET') {
      const result = await AdapterFactory.get(league).getEdgeStats(
        req.query.stat as string,
        parseInt(req.query.min_minutes as string) || 0,
        parseInt(req.query.season as string) || 2025
      );
      return res.json(result);
    }

    // Default 404
    return res.status(404).json({ error: 'route not found', path: cleanPath, league });
  } catch (err) {
    console.error('[router] error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error', detail: String(err) });
    }
  }
}

export default routerHandler;
