/**
 * NBAAdapter - NBA-specific implementation
 * 
 * Implements ILeagueAdapter for NBA league.
 * Data sources:
 * - NBA Stats API (stats.nba.com) - official stats
 * - ESPN API - schedules, injuries, odds
 * - DraftKings/FanDuel APIs - props and betting lines
 * - Player/team data from existing database
 * 
 * Phase 0 Implementation: Foundation only
 * - Stub all external data source calls
 * - Refactor existing nba-specific code to use this adapter
 * - Add caching layer for performance
 */

import {
  ILeagueAdapter,
  League,
  LeagueMetadata,
  Team,
  Player,
  Game,
  GameLog,
  TeamStats,
  Injury,
  OddsMapping,
  ScheduleQuery,
  PlayerSearchQuery,
  GameLogsQuery,
  GameStatus,
  PlayerStatus,
  OddsType,
} from './PHASE_0_LeagueAdapter_Interface';

// ============================================================================
// Configuration & Constants
// ============================================================================

const NBA_LEAGUE_METADATA_2025: LeagueMetadata = {
  id: League.NBA,
  name: 'National Basketball Association',
  season: 2025,
  startDate: new Date('2024-10-22'),
  endDate: new Date('2025-06-15'),
  totalTeams: 30,
  playoffStartDate: new Date('2025-04-12'),
  allStarDate: new Date('2025-02-16'),
  draftDate: new Date('2025-06-26'),
  regularSeasonGames: 82,
  playoffFormat: 'best-of-7',
  conferenceCount: 2,
  divisionPerConference: 3,
  playersPerRoster: 15,
  benchSize: 8,
};

// ============================================================================
// Data Source Clients (Stubbed for Phase 0)
// ============================================================================

interface IDataSourceClient {
  initialize(): Promise<void>;
  healthCheck(): Promise<boolean>;
}

class NBAStatsClient implements IDataSourceClient {
  private baseUrl = 'https://stats.nba.com/api/v1';
  private lastSync: Date | null = null;
  
  async initialize(): Promise<void> {
    // Phase 0: Stub
    console.log('[NBAAdapter] Initializing NBAStatsClient');
  }
  
  async healthCheck(): Promise<boolean> {
    // Phase 0: Stub - return true
    return true;
  }
  
  async getSchedule(season: number): Promise<any[]> {
    // Phase 0: Stub - return empty array
    console.log(`[NBAAdapter] Fetching schedule for season ${season} from NBA Stats API`);
    return [];
  }
  
  async getTeamStats(season: number): Promise<any[]> {
    // Phase 0: Stub
    console.log(`[NBAAdapter] Fetching team stats for season ${season}`);
    return [];
  }
  
  async getPlayerStats(playerId: string): Promise<any> {
    // Phase 0: Stub
    console.log(`[NBAAdapter] Fetching player stats for ${playerId}`);
    return null;
  }
}

class ESPNDataClient implements IDataSourceClient {
  private baseUrl = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
  private lastSync: Date | null = null;
  
  async initialize(): Promise<void> {
    // Phase 0: Stub
    console.log('[NBAAdapter] Initializing ESPNDataClient');
  }
  
  async healthCheck(): Promise<boolean> {
    return true;
  }
  
  async getSchedule(): Promise<any[]> {
    console.log('[NBAAdapter] Fetching schedule from ESPN API');
    return [];
  }
  
  async getInjuries(): Promise<any[]> {
    console.log('[NBAAdapter] Fetching injuries from ESPN');
    return [];
  }
  
  async getTeams(): Promise<any[]> {
    console.log('[NBAAdapter] Fetching teams from ESPN');
    return [];
  }
}

class BettingLinesClient implements IDataSourceClient {
  private sources = {
    draftkings: 'https://api.draftkings.com/v6',
    fanduel: 'https://api.fanduel.com',
    betmgm: 'https://api.betmgm.com',
  };
  private lastSync: Date | null = null;
  
  async initialize(): Promise<void> {
    console.log('[NBAAdapter] Initializing BettingLinesClient');
  }
  
  async healthCheck(): Promise<boolean> {
    return true;
  }
  
  async getGameOdds(gameId: string): Promise<any> {
    console.log(`[NBAAdapter] Fetching odds for game ${gameId}`);
    return null;
  }
  
  async getPlayerPropOdds(playerId: string): Promise<any[]> {
    console.log(`[NBAAdapter] Fetching player props for ${playerId}`);
    return [];
  }
}

// ============================================================================
// Cache Layer
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  ttl: number; // milliseconds
}

class NBACache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp.getTime() > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  set<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      timestamp: new Date(),
      ttl: ttlMs,
    });
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() - entry.timestamp.getTime() > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }
}

// ============================================================================
// NBAAdapter Implementation
// ============================================================================

export class NBAAdapter implements ILeagueAdapter {
  private season: number = 2025;
  private cache: NBACache = new NBACache();
  private lastUpdates: Map<string, Date> = new Map();
  
  // Data source clients
  private nbaStatsClient: NBAStatsClient;
  private espnClient: ESPNDataClient;
  private bettingClient: BettingLinesClient;
  
  // Cache TTLs (in milliseconds)
  private readonly CACHE_TTL = {
    schedule: 1000 * 60 * 60, // 1 hour
    players: 1000 * 60 * 60 * 24, // 24 hours
    stats: 1000 * 60 * 30, // 30 minutes
    injuries: 1000 * 60 * 15, // 15 minutes
    odds: 1000 * 60 * 5, // 5 minutes
  };
  
  constructor() {
    this.nbaStatsClient = new NBAStatsClient();
    this.espnClient = new ESPNDataClient();
    this.bettingClient = new BettingLinesClient();
  }
  
  async initialize(season: number): Promise<void> {
    this.season = season;
    
    console.log(`[NBAAdapter] Initializing for season ${season}`);
    
    try {
      await Promise.all([
        this.nbaStatsClient.initialize(),
        this.espnClient.initialize(),
        this.bettingClient.initialize(),
      ]);
      
      console.log(`[NBAAdapter] Initialization complete`);
    } catch (error) {
      console.error('[NBAAdapter] Initialization failed:', error);
      throw error;
    }
  }
  
  getLeagueMetadata(): LeagueMetadata {
    return NBA_LEAGUE_METADATA_2025;
  }
  
  // ========================================================================
  // Schedule Operations
  // ========================================================================
  
  async schedule(query?: ScheduleQuery): Promise<Game[]> {
    const cacheKey = `schedule:${JSON.stringify(query || {})}`;
    
    // Check cache
    const cached = this.cache.get<Game[]>(cacheKey);
    if (cached) {
      console.log('[NBAAdapter] Returning cached schedule');
      return cached;
    }
    
    try {
      const schedule = await this.nbaStatsClient.getSchedule(this.season);
      
      // Phase 0: Transform stub data to Game[] format
      const games: Game[] = this._transformScheduleData(schedule, query);
      
      // Cache and return
      this.cache.set(cacheKey, games, this.CACHE_TTL.schedule);
      this._recordUpdate('schedule');
      
      return games;
    } catch (error) {
      console.error('[NBAAdapter] Failed to fetch schedule:', error);
      return [];
    }
  }
  
  async getGame(gameId: string): Promise<Game | null> {
    const cacheKey = `game:${gameId}`;
    
    const cached = this.cache.get<Game>(cacheKey);
    if (cached) return cached;
    
    // Phase 0: Fetch single game
    console.log(`[NBAAdapter] Fetching game ${gameId}`);
    
    // TODO: Implement
    return null;
  }
  
  async getTeamSchedule(teamId: string, season?: number): Promise<Game[]> {
    const query: ScheduleQuery = {
      teamId,
      season: season || this.season,
    };
    
    return this.schedule(query);
  }
  
  // ========================================================================
  // Player Search & Information
  // ========================================================================
  
  async playerSearch(query: PlayerSearchQuery): Promise<Player[]> {
    const cacheKey = `playerSearch:${JSON.stringify(query)}`;
    
    const cached = this.cache.get<Player[]>(cacheKey);
    if (cached) return cached;
    
    try {
      // Phase 0: Stub - query local database or ESPN API
      console.log('[NBAAdapter] Searching players:', query);
      
      const results: Player[] = [];
      
      this.cache.set(cacheKey, results, this.CACHE_TTL.players);
      this._recordUpdate('players');
      
      return results;
    } catch (error) {
      console.error('[NBAAdapter] Player search failed:', error);
      return [];
    }
  }
  
  async getPlayer(playerId: string): Promise<Player | null> {
    const cacheKey = `player:${playerId}`;
    
    const cached = this.cache.get<Player>(cacheKey);
    if (cached) return cached;
    
    console.log(`[NBAAdapter] Fetching player ${playerId}`);
    
    // TODO: Implement
    return null;
  }
  
  async getTeamRoster(teamId: string): Promise<Player[]> {
    const cacheKey = `roster:${teamId}`;
    
    const cached = this.cache.get<Player[]>(cacheKey);
    if (cached) return cached;
    
    console.log(`[NBAAdapter] Fetching roster for team ${teamId}`);
    
    // TODO: Implement
    return [];
  }
  
  async getTeams(): Promise<Team[]> {
    const cacheKey = 'teams';
    
    const cached = this.cache.get<Team[]>(cacheKey);
    if (cached) return cached;
    
    try {
      const teams = await this.espnClient.getTeams();
      const transformed: Team[] = this._transformTeamsData(teams);
      
      this.cache.set(cacheKey, transformed, this.CACHE_TTL.players);
      this._recordUpdate('players');
      
      return transformed;
    } catch (error) {
      console.error('[NBAAdapter] Failed to fetch teams:', error);
      return [];
    }
  }
  
  async getTeam(teamId: string): Promise<Team | null> {
    const teams = await this.getTeams();
    return teams.find(t => t.id === teamId) || null;
  }
  
  // ========================================================================
  // Game Logs & Performance Data
  // ========================================================================
  
  async gameLogs(query: GameLogsQuery): Promise<GameLog[]> {
    const cacheKey = `gameLogs:${JSON.stringify(query)}`;
    
    const cached = this.cache.get<GameLog[]>(cacheKey);
    if (cached) return cached;
    
    try {
      console.log('[NBAAdapter] Fetching game logs:', query);
      
      const logs: GameLog[] = [];
      
      this.cache.set(cacheKey, logs, this.CACHE_TTL.stats);
      this._recordUpdate('stats');
      
      return logs;
    } catch (error) {
      console.error('[NBAAdapter] Failed to fetch game logs:', error);
      return [];
    }
  }
  
  async getGameLog(gameLogId: string): Promise<GameLog | null> {
    console.log(`[NBAAdapter] Fetching game log ${gameLogId}`);
    // TODO: Implement
    return null;
  }
  
  async getPlayerStats(playerId: string, season?: number): Promise<Partial<GameLog>> {
    const cacheKey = `playerStats:${playerId}:${season || this.season}`;
    
    const cached = this.cache.get<Partial<GameLog>>(cacheKey);
    if (cached) return cached;
    
    try {
      const stats = await this.nbaStatsClient.getPlayerStats(playerId);
      const transformed = this._transformPlayerStats(stats);
      
      this.cache.set(cacheKey, transformed, this.CACHE_TTL.stats);
      this._recordUpdate('stats');
      
      return transformed;
    } catch (error) {
      console.error('[NBAAdapter] Failed to fetch player stats:', error);
      return {};
    }
  }
  
  // ========================================================================
  // Team Statistics
  // ========================================================================
  
  async teamStats(season?: number): Promise<TeamStats[]> {
    const cacheKey = `teamStats:${season || this.season}`;
    
    const cached = this.cache.get<TeamStats[]>(cacheKey);
    if (cached) return cached;
    
    try {
      const stats = await this.nbaStatsClient.getTeamStats(season || this.season);
      const transformed: TeamStats[] = this._transformTeamStats(stats);
      
      this.cache.set(cacheKey, transformed, this.CACHE_TTL.stats);
      this._recordUpdate('stats');
      
      return transformed;
    } catch (error) {
      console.error('[NBAAdapter] Failed to fetch team stats:', error);
      return [];
    }
  }
  
  async getTeamStats(teamId: string, season?: number): Promise<TeamStats | null> {
    const stats = await this.teamStats(season);
    return stats.find(s => s.teamId === teamId) || null;
  }
  
  async getAdvancedStats(teamId: string, season?: number): Promise<Record<string, any>> {
    // Phase 0: Calculate from game logs or fetch from advanced stats source
    console.log(`[NBAAdapter] Calculating advanced stats for ${teamId}`);
    
    // TODO: Implement (Win Shares, PER, etc.)
    return {};
  }
  
  // ========================================================================
  // Injury/Availability Tracking
  // ========================================================================
  
  async injuries(): Promise<Injury[]> {
    const cacheKey = 'injuries';
    
    const cached = this.cache.get<Injury[]>(cacheKey);
    if (cached) return cached;
    
    try {
      const injuries = await this.espnClient.getInjuries();
      const transformed: Injury[] = this._transformInjuries(injuries);
      
      this.cache.set(cacheKey, transformed, this.CACHE_TTL.injuries);
      this._recordUpdate('injuries');
      
      return transformed;
    } catch (error) {
      console.error('[NBAAdapter] Failed to fetch injuries:', error);
      return [];
    }
  }
  
  async getTeamInjuries(teamId: string): Promise<Injury[]> {
    const allInjuries = await this.injuries();
    return allInjuries.filter(i => i.teamId === teamId);
  }
  
  async getPlayerInjuries(playerId: string): Promise<Injury[]> {
    const allInjuries = await this.injuries();
    return allInjuries.filter(i => i.playerId === playerId);
  }
  
  async getPlayerStatus(playerId: string): Promise<PlayerStatus> {
    const injuries = await this.getPlayerInjuries(playerId);
    
    if (injuries.length === 0) {
      return PlayerStatus.ACTIVE;
    }
    
    // Return most recent injury status
    return injuries[0].status;
  }
  
  // ========================================================================
  // Odds & Betting Lines
  // ========================================================================
  
  async oddsMapping(oddsType: OddsType): Promise<OddsMapping[]> {
    const cacheKey = `odds:${oddsType}`;
    
    const cached = this.cache.get<OddsMapping[]>(cacheKey);
    if (cached) return cached;
    
    try {
      console.log(`[NBAAdapter] Fetching ${oddsType} odds`);
      
      let odds: any[] = [];
      
      // Fetch from multiple betting sources
      switch (oddsType) {
        case OddsType.PLAYER_PROPS:
          odds = await this.bettingClient.getPlayerPropOdds('*');
          break;
        default:
          // Game odds, spreads, etc.
          break;
      }
      
      const transformed: OddsMapping[] = this._transformOdds(odds, oddsType);
      
      this.cache.set(cacheKey, transformed, this.CACHE_TTL.odds);
      this._recordUpdate('odds');
      
      return transformed;
    } catch (error) {
      console.error('[NBAAdapter] Failed to fetch odds:', error);
      return [];
    }
  }
  
  async getGameOdds(gameId: string): Promise<OddsMapping | null> {
    try {
      const odds = await this.bettingClient.getGameOdds(gameId);
      return odds ? this._transformOddsSingle(odds) : null;
    } catch (error) {
      console.error('[NBAAdapter] Failed to fetch game odds:', error);
      return null;
    }
  }
  
  async getPlayerPropOdds(playerId: string, season?: number): Promise<OddsMapping[]> {
    const cacheKey = `playerProps:${playerId}:${season || this.season}`;
    
    const cached = this.cache.get<OddsMapping[]>(cacheKey);
    if (cached) return cached;
    
    try {
      const odds = await this.bettingClient.getPlayerPropOdds(playerId);
      const transformed: OddsMapping[] = this._transformOdds(odds, OddsType.PLAYER_PROPS);
      
      this.cache.set(cacheKey, transformed, this.CACHE_TTL.odds);
      
      return transformed;
    } catch (error) {
      console.error('[NBAAdapter] Failed to fetch player prop odds:', error);
      return [];
    }
  }
  
  async getLineHistory(gameId: string): Promise<OddsMapping['lineHistory']> {
    // Phase 0: Stub - requires historical odds tracking database
    console.log(`[NBAAdapter] Fetching line history for game ${gameId}`);
    return undefined;
  }
  
  // ========================================================================
  // Data Refresh & Caching
  // ========================================================================
  
  async refresh(): Promise<void> {
    console.log('[NBAAdapter] Refreshing all data');
    
    try {
      // Refresh high-priority data
      await Promise.all([
        this.schedule(),
        this.injuries(),
        this.oddsMapping(OddsType.MONEYLINE),
      ]);
      
      console.log('[NBAAdapter] Data refresh complete');
    } catch (error) {
      console.error('[NBAAdapter] Refresh failed:', error);
      throw error;
    }
  }
  
  async clearCache(): Promise<void> {
    this.cache.clear();
    this.lastUpdates.clear();
    console.log('[NBAAdapter] Cache cleared');
  }
  
  getLastUpdate(dataType: 'schedule' | 'players' | 'stats' | 'injuries' | 'odds'): Date | null {
    return this.lastUpdates.get(dataType) || null;
  }
  
  async healthCheck(): Promise<{ healthy: boolean; message: string; lastSync?: Date }> {
    try {
      const [statsOk, espnOk, bettingOk] = await Promise.all([
        this.nbaStatsClient.healthCheck(),
        this.espnClient.healthCheck(),
        this.bettingClient.healthCheck(),
      ]);
      
      if (statsOk && espnOk && bettingOk) {
        return {
          healthy: true,
          message: 'All data sources operational',
          lastSync: new Date(),
        };
      } else {
        return {
          healthy: false,
          message: 'One or more data sources unavailable',
        };
      }
    } catch (error) {
      return {
        healthy: false,
        message: `Health check failed: ${error}`,
      };
    }
  }
  
  // ========================================================================
  // Private Helper Methods - Data Transformation
  // ========================================================================
  
  private _transformScheduleData(data: any[], query?: ScheduleQuery): Game[] {
    // Phase 0: Stub transformation
    // TODO: Implement actual transformation logic
    return [];
  }
  
  private _transformTeamsData(data: any[]): Team[] {
    // Phase 0: Stub transformation
    return [];
  }
  
  private _transformPlayerStats(data: any): Partial<GameLog> {
    // Phase 0: Stub transformation
    return {};
  }
  
  private _transformTeamStats(data: any[]): TeamStats[] {
    // Phase 0: Stub transformation
    return [];
  }
  
  private _transformInjuries(data: any[]): Injury[] {
    // Phase 0: Stub transformation
    return [];
  }
  
  private _transformOdds(data: any[], type: OddsType): OddsMapping[] {
    // Phase 0: Stub transformation
    return [];
  }
  
  private _transformOddsSingle(data: any): OddsMapping {
    // Phase 0: Stub transformation
    return {} as OddsMapping;
  }
  
  private _recordUpdate(dataType: string): void {
    this.lastUpdates.set(dataType, new Date());
  }
}

// ============================================================================
// Bootstrap
// ============================================================================

// Export instance
export const nbaAdapter = new NBAAdapter();

// Usage in app initialization:
/*
import { LeagueAdapterFactory, League } from './PHASE_0_LeagueAdapter_Interface';
import { NBAAdapter } from './PHASE_0_NBAAdapter';

// Register adapter
LeagueAdapterFactory.register(League.NBA, NBAAdapter);

// Later, in API initialization:
const nbaAdapter = LeagueAdapterFactory.create(League.NBA);
await nbaAdapter.initialize(2025);
*/
