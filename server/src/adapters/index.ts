/**
 * League Adapter Package
 * 
 * Centralized exports for all adapter-related code.
 * Phase 0: NBA only
 * Phase 1+: WNBA, other leagues
 */

// Types & interfaces
export * from './types';

// Factory
export { LeagueAdapterFactory } from './factory';

// Adapters
export { NBAAdapter } from './nba';

// Bootstrap function for application startup
import { LeagueAdapterFactory } from './factory';
import { NBAAdapter } from './nba';
import { League } from './types';

export function bootstrapAdapters(): void {
  console.log('[Adapters] Bootstrapping league adapters');
  
  // Register Phase 0 adapters
  LeagueAdapterFactory.register(League.NBA, NBAAdapter);
  
  // Phase 1+: Register additional adapters
  // LeagueAdapterFactory.register(League.WNBA, WNBAAdapter);
  
  console.log('[Adapters] Registered leagues:', LeagueAdapterFactory.getSupportedLeagues().join(', '));
}
