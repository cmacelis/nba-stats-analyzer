/**
 * Adapter Middleware
 * 
 * Extracts league from URL parameters or query, resolves the appropriate adapter,
 * and attaches it to the request context for route handlers.
 * 
 * Supports both legacy routes (/api/edge) and new league-aware routes (/api/:league/edge)
 */

import { Request, Response, NextFunction } from 'express';
import { LeagueAdapterFactory } from '../adapters';
import { League, ILeagueAdapter } from '../adapters/types';

export interface LeagueRequest extends Request {
  league: League;
  adapter: ILeagueAdapter;
}

/**
 * Middleware factory: creates middleware for a specific league or auto-detect
 */
export function adapterMiddleware(defaultLeague: League = League.NBA) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Try to get league from route params first
      let league = (req.params.league as League) || defaultLeague;
      
      // Fallback to query param
      if (!league && req.query.league) {
        league = req.query.league as League;
      }
      
      // Validate league
      if (!LeagueAdapterFactory.isSupported(league)) {
        return res.status(400).json({
          error: 'Unsupported league',
          league,
          supported: LeagueAdapterFactory.getSupportedLeagues(),
        });
      }
      
      // Create adapter instance
      const adapter = LeagueAdapterFactory.create(league);
      
      // Attach to request
      const leagueReq = req as LeagueRequest;
      leagueReq.league = league;
      leagueReq.adapter = adapter;
      
      // Log for debugging
      console.log(`[Adapter Middleware] Route: ${req.method} ${req.path} | League: ${league}`);
      
      next();
    } catch (error) {
      console.error('[Adapter Middleware] Error:', error);
      res.status(500).json({
        error: 'Adapter initialization failed',
        message: (error as Error).message,
      });
    }
  };
}

/**
 * Helper to extract league from request (with fallback logic)
 */
export function getLeagueFromRequest(req: Request): League {
  const leagueReq = req as LeagueRequest;
  
  // If already set by middleware
  if (leagueReq.league) {
    return leagueReq.league;
  }
  
  // Try to extract from various sources
  const fromParams = (req.params.league as League);
  const fromQuery = (req.query.league as League);
  
  return fromParams || fromQuery || League.NBA; // default to NBA
}

/**
 * Helper to ensure adapter is attached to request
 */
export function ensureAdapter(defaultLeague: League = League.NBA) {
  return (req: Request, res: Response, next: NextFunction) => {
    const leagueReq = req as LeagueRequest;
    
    if (!leagueReq.adapter) {
      const league = getLeagueFromRequest(req) || defaultLeague;
      leagueReq.league = league;
      leagueReq.adapter = LeagueAdapterFactory.create(league);
    }
    
    next();
  };
}
