import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib.js';
import { nbaPlayerSearchHandler } from '../handlers/nba/players.js';
import { fail } from '../shared/response';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  
  // Extract the path (everything after /api/core/)
  const raw = req.query.path;
  const parts = Array.isArray(raw) ? raw : (raw ? String(raw).split('/') : []);
  const path = parts.join('/');
  const method = req.method;

  // Handle /api/core/nba/players route
  if (path === 'nba/players' && method === 'GET') {
    return nbaPlayerSearchHandler(req, res, { league: 'nba' });
  }

  // Handle /api/core/wnba/players route
  if (path === 'wnba/players' && method === 'GET') {
    return nbaPlayerSearchHandler(req, res, { league: 'wnba' });
  }

  // Return 501 Not Implemented for other core routes
  const response = fail(
    'NOT_IMPLEMENTED',
    'Core API endpoint not implemented. Available endpoints: /api/core/nba/players, /api/core/wnba/players',
    501
  );
  
  res.status(501).json(response);
}