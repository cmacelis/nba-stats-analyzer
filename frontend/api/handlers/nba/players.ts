/**
 * Shared NBA player search handler module
 * 
 * This module contains the core player search logic that can be reused
 * by multiple endpoints (/api/players and /api/core/nba/players).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { searchPlayers, findNbaPersonId, buildNbaPhotoUrl, BdlPlayer } from '../../_lib.js';

/**
 * Shared NBA player search handler function
 * 
 * @param req - Vercel request object
 * @param res - Vercel response object
 * @param options - Optional configuration
 * @param options.league - League to search ('nba' or 'wnba'), defaults to 'nba'
 */
export async function nbaPlayerSearchHandler(
  req: VercelRequest, 
  res: VercelResponse,
  options: { league?: string } = {}
): Promise<void> {
  try {
    const search = (req.query.search as string) || '';
    if (!search) {
      res.status(400).json({ error: 'search query param is required' });
      return;
    }

    // Get league from options or query parameter, default to 'nba'
    const league = options.league || ((req.query.league as string) || 'nba').toLowerCase();
    if (!['nba', 'wnba'].includes(league)) {
      res.status(400).json({ error: 'Invalid league. Must be "nba" or "wnba"' });
      return;
    }

    const result = await searchPlayers(search, league);
    
    // Enrich with photo URLs
    const enriched = await Promise.all(
      result.data.map(async (p: BdlPlayer) => {
        const fullName = `${p.first_name} ${p.last_name}`;
        const personId = await findNbaPersonId(fullName).catch(() => null);
        return { ...p, photo_url: personId != null ? buildNbaPhotoUrl(personId) : null };
      })
    );
    
    res.json({ ...result, data: enriched });
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = err as any;
    if (e?.response?.status === 401) {
      res.status(402).json({ 
        error: 'plan_required', 
        message: 'Player search requires a valid BallDontLie API key.' 
      });
      return;
    }
    console.error('[nbaPlayerSearchHandler] error:', e?.message);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to fetch player data', 
        detail: String(err) 
      });
    }
  }
}