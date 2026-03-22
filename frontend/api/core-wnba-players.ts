import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib.js';
import { nbaPlayerSearchHandler } from './handlers/nba/players.js';

/**
 * Core WNBA players endpoint (placeholder)
 * 
 * Route: /api/core-wnba-players?search={query}
 * Alternative: /api/core/wnba/players?search={query} (via rewrite)
 * 
 * Note: WNBA player search is not yet implemented.
 * This currently returns NBA players (same as legacy endpoint).
 * WNBA implementation is a separate backlog item.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Call the shared handler with WNBA league
  // Note: This currently returns NBA players due to BDL API limitation
  return await nbaPlayerSearchHandler(req, res);
}