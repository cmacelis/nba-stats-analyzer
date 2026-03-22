import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib.js';
import { nbaPlayerSearchHandler } from './handlers/nba/players.js';

/**
 * Core NBA players endpoint
 * 
 * Route: /api/core-nba-players?search={query}
 * Alternative: /api/core/nba/players?search={query} (via rewrite)
 * 
 * This is a temporary fix to unblock infrastructure hardening.
 * Once routing is fixed, this can be consolidated into the core/[[...path]].ts pattern.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Call the shared handler with NBA league
  return await nbaPlayerSearchHandler(req, res);
}