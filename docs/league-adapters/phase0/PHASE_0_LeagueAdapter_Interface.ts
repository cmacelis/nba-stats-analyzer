/**
 * LeagueAdapter Interface - Multi-Sport Foundation
 * 
 * Core abstraction layer enabling NBA Stats Analyzer to support multiple leagues.
 * All league-specific logic flows through this interface. No league-specific code in core.
 * 
 * Requires implementations: NBAAdapter (Phase 0), WNBAAdapter (Phase 1)
 */

// ============================================================================
// Core Types & Enums
// ============================================================================

export enum League {
  NBA = 'nba',
  WNBA = 'wnba',
  // Future: EUROLEAGUE = 'euroleague', MLB = 'mlb', etc.
}

export enum GameStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  POSTPONED = 'postponed',
  CANCELLED = 'cancelled',
}

export enum PlayerStatus {
  ACTIVE = 'active',
  OUT = 'out',
  DAY_TO_DAY = 'day_to_day',
  PROBABLE = 'probable',
  DOUBTFUL = 'doubtful',
  OUT_FOR_SEASON = 'out_for_season',
  RETIRED = 'retired',
}

export enum OddsType {
  MONEYLINE = 'moneyline',
  SPREAD = 'spread',
  TOTAL = 'total',
  PLAYER_PROPS = 'player_props',
  TEAM_PROPS = 'team_props',
}

// ============================================================================
// Data Models
// ============================================================================

export interface LeagueMetadata {
  id: League;
  name: string;
  season: number;
  startDate: Date;
  endDate: Date;
  totalTeams: number;
  playoffStartDate?: Date;
  allStarDate?: Date;
  draftDate?: Date;
  // League-specific configs
  regularSeasonGames: number;
  playoffFormat?: string; // e.g., "best-of-7", "best-of-5"
  conferenceCount: number;
  divisionPerConference: number;
  playersPerRoster: number;
  benchSize: number;
}

export interface Team {
  id: string;
  leagueId: League;
  name: string;
  abbreviation: string;
  city: string;
  logo: string;
  conference: string;
  division: string;
  founded?: number;
  arena?: string;
  generalManager?: string;
  headCoach?: string;
}

export interface Player {
  id: string;
  leagueId: League;
  firstName: string;
  lastName: string;
  number: number;
  position: string;
  height?: string; // e.g., "6'7\""
  weight?: number; // in lbs
  birthDate?: Date;
  country?: string;
  draft?: {
    year: number;
    round: number;
    pick: number;
  };
  team?: Team;
  salary?: number;
  contractExpiration?: Date;
}

export interface Game {
  id: string;
  leagueId: League;
  season: number;
  date: Date;
  status: GameStatus;
  homeTeam: Team;
  awayTeam: Team;
  homeScore?: number;
  awayScore?: number;
  venue?: string;
  referees?: string[];
  duration?: number; // in minutes
  notes?: string;
}

export interface GameLog {
  id: string;
  gameId: string;
  playerId: string;
  teamId: string;
  date: Date;
  minutes: number;
  points: number;
  rebounds?: number;
  assists?: number;
  steals?: number;
  blocks?: number;
  turnovers?: number;
  fieldGoalsMade?: number;
  fieldGoalsAttempted?: number;
  threePointersMade?: number;
  threePointersAttempted?: number;
  freeThrowsMade?: number;
  freeThrowsAttempted?: number;
  fouls?: number;
  plusMinus?: number;
  benchOrStarter?: 'bench' | 'starter';
  // Custom league-specific stats can go here
  [key: string]: any;
}

export interface TeamStats {
  teamId: string;
  leagueId: League;
  season: number;
  asOf: Date;
  
  // Record
  wins: number;
  losses: number;
  
  // Offensive stats (per game)
  pointsPerGame: number;
  fieldGoalPercentage: number;
  threePointPercentage: number;
  freeThrowPercentage: number;
  reboundsPerGame: number;
  assistsPerGame: number;
  turnoversPerGame: number;
  
  // Defensive stats
  pointsAllowedPerGame: number;
  defensiveRating: number;
  offensiveRating: number;
  
  // Strength of schedule
  strengthOfSchedule?: number;
  
  // Custom stats
  [key: string]: any;
}

export interface Injury {
  id: string;
  playerId: string;
  playerName: string;
  teamId: string;
  leagueId: League;
  status: PlayerStatus;
  injuryType: string;
  description: string;
  reportedDate: Date;
  returnDate?: Date;
  source?: string; // e.g., "official", "twitter", "news"
}

export interface OddsMapping {
  id: string;
  gameId: string;
  leagueId: League;
  oddsType: OddsType;
  homeTeamOdds?: number | string; // moneyline, spread as number, etc.
  awayTeamOdds?: number | string;
  overUnder?: number;
  bookmakerIds: string[]; // ESPN, DraftKings, FanDuel, etc.
  asOf: Date;
  
  // For player props
  playerId?: string;
  propName?: string; // e.g., "Points", "Assists", "Rebounds"
  propLine?: number;
  
  // Line movement tracking
  lineHistory?: {
    timestamp: Date;
    line: number | string;
  }[];
}

export interface ScheduleQuery {
  season?: number;
  startDate?: Date;
  endDate?: Date;
  teamId?: string;
  conference?: string;
  division?: string;
  status?: GameStatus;
}

export interface PlayerSearchQuery {
  firstName?: string;
  lastName?: string;
  teamId?: string;
  position?: string;
  minHeight?: string;
  maxHeight?: string;
  country?: string;
  draftYear?: number;
  active?: boolean;
}

export interface GameLogsQuery {
  playerId?: string;
  teamId?: string;
  startDate?: Date;
  endDate?: Date;
  season?: number;
  opponent?: string;
  minMinutes?: number;
  statusFilter?: 'bench' | 'starter' | 'all';
}

// ============================================================================
// Main LeagueAdapter Interface
// ============================================================================

export interface ILeagueAdapter {
  /**
   * Initialize the adapter for a specific season/league
   */
  initialize(season: number): Promise<void>;
  
  /**
   * Get league metadata and configuration
   */
  getLeagueMetadata(): LeagueMetadata;
  
  // ========================================================================
  // Schedule Operations
  // ========================================================================
  
  /**
   * Fetch league schedule with optional filters
   * @param query - Filter parameters
   * @returns Array of games matching criteria
   */
  schedule(query?: ScheduleQuery): Promise<Game[]>;
  
  /**
   * Get a single game by ID
   */
  getGame(gameId: string): Promise<Game | null>;
  
  /**
   * Get team's schedule for the season
   */
  getTeamSchedule(teamId: string, season?: number): Promise<Game[]>;
  
  // ========================================================================
  // Player Search & Information
  // ========================================================================
  
  /**
   * Search players in the league
   * @param query - Search parameters
   * @returns Matching players
   */
  playerSearch(query: PlayerSearchQuery): Promise<Player[]>;
  
  /**
   * Get detailed player information
   */
  getPlayer(playerId: string): Promise<Player | null>;
  
  /**
   * Get all players on a team
   */
  getTeamRoster(teamId: string): Promise<Player[]>;
  
  /**
   * Get all teams in the league
   */
  getTeams(): Promise<Team[]>;
  
  /**
   * Get single team
   */
  getTeam(teamId: string): Promise<Team | null>;
  
  // ========================================================================
  // Game Logs & Performance Data
  // ========================================================================
  
  /**
   * Fetch game logs with filters
   * @param query - Filter parameters
   * @returns Array of game logs
   */
  gameLogs(query: GameLogsQuery): Promise<GameLog[]>;
  
  /**
   * Get single game log entry
   */
  getGameLog(gameLogId: string): Promise<GameLog | null>;
  
  /**
   * Get player's season stats (aggregated game logs)
   */
  getPlayerStats(playerId: string, season?: number): Promise<Partial<GameLog>>;
  
  // ========================================================================
  // Team Statistics
  // ========================================================================
  
  /**
   * Get aggregated team statistics
   * @param season - Optional season filter
   * @returns Team stats sorted by wins/ranking
   */
  teamStats(season?: number): Promise<TeamStats[]>;
  
  /**
   * Get single team's stats
   */
  getTeamStats(teamId: string, season?: number): Promise<TeamStats | null>;
  
  /**
   * Get advanced/calculated stats (win shares, PER, etc.)
   */
  getAdvancedStats(teamId: string, season?: number): Promise<Record<string, any>>;
  
  // ========================================================================
  // Injury/Availability Tracking
  // ========================================================================
  
  /**
   * Get current injury reports
   * @returns All active injuries for the season
   */
  injuries(): Promise<Injury[]>;
  
  /**
   * Get team's injury report
   */
  getTeamInjuries(teamId: string): Promise<Injury[]>;
  
  /**
   * Get player's injury history
   */
  getPlayerInjuries(playerId: string): Promise<Injury[]>;
  
  /**
   * Check player availability for upcoming games
   */
  getPlayerStatus(playerId: string): Promise<PlayerStatus>;
  
  // ========================================================================
  // Odds & Betting Lines
  // ========================================================================
  
  /**
   * Get odds mapping for games/props
   * @param oddsType - Type of odds to fetch
   * @returns Odds data with historical tracking
   */
  oddsMapping(oddsType: OddsType): Promise<OddsMapping[]>;
  
  /**
   * Get odds for specific game
   */
  getGameOdds(gameId: string): Promise<OddsMapping | null>;
  
  /**
   * Get player prop odds
   */
  getPlayerPropOdds(playerId: string, season?: number): Promise<OddsMapping[]>;
  
  /**
   * Get line movement/history for a specific matchup
   */
  getLineHistory(gameId: string): Promise<OddsMapping['lineHistory']>;
  
  // ========================================================================
  // Data Refresh & Caching
  // ========================================================================
  
  /**
   * Update cached data from source
   */
  refresh(): Promise<void>;
  
  /**
   * Clear all cached data
   */
  clearCache(): Promise<void>;
  
  /**
   * Get last update timestamp for a data type
   */
  getLastUpdate(dataType: 'schedule' | 'players' | 'stats' | 'injuries' | 'odds'): Date | null;
  
  // ========================================================================
  // Health Check
  // ========================================================================
  
  /**
   * Verify adapter is working and data source is accessible
   */
  healthCheck(): Promise<{ healthy: boolean; message: string; lastSync?: Date }>;
}

// ============================================================================
// Adapter Factory & Registry
// ============================================================================

/**
 * Factory for creating league adapters
 */
export class LeagueAdapterFactory {
  private static adapters: Map<League, new () => ILeagueAdapter> = new Map();
  
  static register(league: League, adapterClass: new () => ILeagueAdapter): void {
    this.adapters.set(league, adapterClass);
  }
  
  static create(league: League): ILeagueAdapter {
    const AdapterClass = this.adapters.get(league);
    if (!AdapterClass) {
      throw new Error(`No adapter registered for league: ${league}`);
    }
    return new AdapterClass();
  }
  
  static isSupported(league: League): boolean {
    return this.adapters.has(league);
  }
}

// ============================================================================
// Usage Example
// ============================================================================

/*
// Bootstrap adapters in app initialization
LeagueAdapterFactory.register(League.NBA, NBAAdapter);
LeagueAdapterFactory.register(League.WNBA, WNBAAdapter);

// Use in API handlers
async function getSchedule(leagueId: string, query: ScheduleQuery) {
  const league = leagueId as League;
  const adapter = LeagueAdapterFactory.create(league);
  await adapter.initialize(2025); // current season
  return adapter.schedule(query);
}
*/
