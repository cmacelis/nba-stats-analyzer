/**
 * Adapter Configuration
 * 
 * Feature flags and configuration for multi-league adapter support.
 * 
 * Env Variables:
 * - ADAPTERS_ENABLED: Enable/disable adapter-based routing (default: true)
 * - DEFAULT_LEAGUE: Default league for legacy routes (default: 'nba')
 * - ADAPTER_LOG_LEVEL: Log level for adapter operations (default: 'info')
 */

export interface AdapterConfig {
  /** Enable adapter-based routing; if false, fall back to direct NBA calls */
  enabled: boolean;
  
  /** Default league for legacy endpoints */
  defaultLeague: string;
  
  /** Log level for adapter debugging */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  
  /** Feature flags for gradual rollout */
  features: {
    /** Use adapters for /api/edge endpoint */
    edgeAdapter: boolean;
    
    /** Use adapters for /api/players endpoints */
    playersAdapter: boolean;
    
    /** Use adapters for /api/games endpoints */
    gamesAdapter: boolean;
    
    /** Enable new /api/:league/* routes */
    leagueAwareRoutes: boolean;
    
    /** Show league selector in UI */
    leagueUISwitcher: boolean;
  };
}

/**
 * Load adapter configuration from environment
 */
function loadConfig(): AdapterConfig {
  const enabled = process.env.ADAPTERS_ENABLED !== 'false'; // default: true
  
  return {
    enabled,
    defaultLeague: process.env.DEFAULT_LEAGUE || 'nba',
    logLevel: (process.env.ADAPTER_LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
    features: {
      edgeAdapter: enabled && process.env.ADAPTER_EDGE !== 'false',
      playersAdapter: enabled && process.env.ADAPTER_PLAYERS !== 'false',
      gamesAdapter: enabled && process.env.ADAPTER_GAMES !== 'false',
      leagueAwareRoutes: enabled && process.env.LEAGUE_AWARE_ROUTES !== 'false',
      leagueUISwitcher: process.env.LEAGUE_UI_SWITCHER === 'true',
    },
  };
}

export const adapterConfig = loadConfig();

/**
 * Log configuration at startup
 */
export function logAdapterConfig(): void {
  console.log('[Config] Adapter Configuration:');
  console.log(`  Enabled: ${adapterConfig.enabled}`);
  console.log(`  Default League: ${adapterConfig.defaultLeague}`);
  console.log(`  Log Level: ${adapterConfig.logLevel}`);
  console.log('  Features:');
  console.log(`    - Edge Adapter: ${adapterConfig.features.edgeAdapter}`);
  console.log(`    - Players Adapter: ${adapterConfig.features.playersAdapter}`);
  console.log(`    - Games Adapter: ${adapterConfig.features.gamesAdapter}`);
  console.log(`    - League-aware Routes: ${adapterConfig.features.leagueAwareRoutes}`);
  console.log(`    - League UI Switcher: ${adapterConfig.features.leagueUISwitcher}`);
}
