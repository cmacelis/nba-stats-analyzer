/**
 * BaseLeagueAdapter
 * 
 * Abstract base class for all league adapters.
 * Provides common functionality: caching, error handling, logging.
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
} from '../types';

interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  ttl: number; // in milliseconds
}

export abstract class BaseLeagueAdapter implements ILeagueAdapter {
  protected league: League;
  protected metadata: LeagueMetadata | null = null;
  protected cache: Map<string, CacheEntry<any>> = new Map();
  protected lastUpdates: Map<string, Date> = new Map();
  protected initialized = false;

  constructor(league: League) {
    this.league = league;
  }

  // ========================================================================
  // Cache Management
  // ========================================================================

  protected getCacheKey(prefix: string, ...parts: (string | undefined)[]): string {
    return `${this.league}:${prefix}:${parts.filter(Boolean).join(':')}`;
  }

  protected getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    const age = now - entry.timestamp.getTime();

    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  protected setCached<T>(key: string, data: T, ttlMs: number = 60000): void {
    this.cache.set(key, {
      data,
      timestamp: new Date(),
      ttl: ttlMs,
    });
  }

  // ========================================================================
  // Abstract Methods (must be implemented by subclasses)
  // ========================================================================

  abstract initialize(season: number): Promise<void>;
  abstract getLeagueMetadata(): LeagueMetadata;
  
  abstract schedule(query?: ScheduleQuery): Promise<Game[]>;
  abstract getGame(gameId: string): Promise<Game | null>;
  abstract getTeamSchedule(teamId: string, season?: number): Promise<Game[]>;
  
  abstract playerSearch(query: PlayerSearchQuery): Promise<Player[]>;
  abstract getPlayer(playerId: string): Promise<Player | null>;
  abstract getTeamRoster(teamId: string): Promise<Player[]>;
  abstract getTeams(): Promise<Team[]>;
  abstract getTeam(teamId: string): Promise<Team | null>;
  
  abstract gameLogs(query: GameLogsQuery): Promise<GameLog[]>;
  abstract getGameLog(gameLogId: string): Promise<GameLog | null>;
  abstract getPlayerStats(playerId: string, season?: number): Promise<Partial<GameLog>>;
  
  abstract teamStats(season?: number): Promise<TeamStats[]>;
  abstract getTeamStats(teamId: string, season?: number): Promise<TeamStats | null>;
  abstract getAdvancedStats(teamId: string, season?: number): Promise<Record<string, any>>;
  
  abstract injuries(): Promise<Injury[]>;
  abstract getTeamInjuries(teamId: string): Promise<Injury[]>;
  abstract getPlayerInjuries(playerId: string): Promise<Injury[]>;
  abstract getPlayerStatus(playerId: string): Promise<PlayerStatus>;
  
  abstract oddsMapping(oddsType: OddsType): Promise<OddsMapping[]>;
  abstract getGameOdds(gameId: string): Promise<OddsMapping | null>;
  abstract getPlayerPropOdds(playerId: string, season?: number): Promise<OddsMapping[]>;
  abstract getLineHistory(gameId: string): Promise<OddsMapping['lineHistory']>;
  
  abstract healthCheck(): Promise<{ healthy: boolean; message: string; lastSync?: Date }>;

  // ========================================================================
  // Common Operations
  // ========================================================================

  async refresh(): Promise<void> {
    console.log(`[${this.league.toUpperCase()}] Refreshing all cached data`);
    this.clearCache();
    // Subclasses can override to implement actual refresh logic
  }

  async clearCache(): Promise<void> {
    console.log(`[${this.league.toUpperCase()}] Clearing cache`);
    this.cache.clear();
    this.lastUpdates.clear();
  }

  getLastUpdate(dataType: 'schedule' | 'players' | 'stats' | 'injuries' | 'odds'): Date | null {
    const key = `${this.league}:${dataType}`;
    return this.lastUpdates.get(key) || null;
  }

  protected setLastUpdate(dataType: 'schedule' | 'players' | 'stats' | 'injuries' | 'odds'): void {
    const key = `${this.league}:${dataType}`;
    this.lastUpdates.set(key, new Date());
  }

  // ========================================================================
  // Logging & Error Handling
  // ========================================================================

  protected log(message: string, data?: any): void {
    console.log(`[${this.league.toUpperCase()}] ${message}`, data || '');
  }

  protected error(message: string, error?: any): void {
    console.error(`[${this.league.toUpperCase()}] ERROR: ${message}`, error || '');
  }

  protected warn(message: string): void {
    console.warn(`[${this.league.toUpperCase()}] WARNING: ${message}`);
  }
}
