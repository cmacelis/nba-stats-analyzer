/**
 * LeagueAdapter Interface - Multi-Sport Foundation
 * 
 * Core abstraction layer enabling NBA Stats Analyzer to support multiple leagues.
 * All league-specific logic flows through this interface. No league-specific code in core.
 * 
 * Phase 0: NBA Foundation
 * Phase 1+: WNBA, other leagues
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
  regularSeasonGames: number;
  playoffFormat?: string;
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
  height?: string;
  weight?: number;
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
  duration?: number;
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
  [key: string]: any;
}

export interface TeamStats {
  teamId: string;
  leagueId: League;
  season: number;
  asOf: Date;
  wins: number;
  losses: number;
  pointsPerGame: number;
  fieldGoalPercentage: number;
  threePointPercentage: number;
  freeThrowPercentage: number;
  reboundsPerGame: number;
  assistsPerGame: number;
  turnoversPerGame: number;
  pointsAllowedPerGame: number;
  defensiveRating: number;
  offensiveRating: number;
  strengthOfSchedule?: number;
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
  source?: string;
}

export interface OddsMapping {
  id: string;
  gameId: string;
  leagueId: League;
  oddsType: OddsType;
  homeTeamOdds?: number | string;
  awayTeamOdds?: number | string;
  overUnder?: number;
  bookmakerIds: string[];
  asOf: Date;
  playerId?: string;
  propName?: string;
  propLine?: number;
  lineHistory?: {
    timestamp: Date;
    line: number | string;
  }[];
}

// ============================================================================
// Query Interfaces
// ============================================================================

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
  initialize(season: number): Promise<void>;
  getLeagueMetadata(): LeagueMetadata;
  
  // Schedule
  schedule(query?: ScheduleQuery): Promise<Game[]>;
  getGame(gameId: string): Promise<Game | null>;
  getTeamSchedule(teamId: string, season?: number): Promise<Game[]>;
  
  // Players
  playerSearch(query: PlayerSearchQuery): Promise<Player[]>;
  getPlayer(playerId: string): Promise<Player | null>;
  getTeamRoster(teamId: string): Promise<Player[]>;
  getTeams(): Promise<Team[]>;
  getTeam(teamId: string): Promise<Team | null>;
  
  // Game Logs
  gameLogs(query: GameLogsQuery): Promise<GameLog[]>;
  getGameLog(gameLogId: string): Promise<GameLog | null>;
  getPlayerStats(playerId: string, season?: number): Promise<Partial<GameLog>>;
  
  // Team Stats
  teamStats(season?: number): Promise<TeamStats[]>;
  getTeamStats(teamId: string, season?: number): Promise<TeamStats | null>;
  getAdvancedStats(teamId: string, season?: number): Promise<Record<string, any>>;
  
  // Injuries
  injuries(): Promise<Injury[]>;
  getTeamInjuries(teamId: string): Promise<Injury[]>;
  getPlayerInjuries(playerId: string): Promise<Injury[]>;
  getPlayerStatus(playerId: string): Promise<PlayerStatus>;
  
  // Odds
  oddsMapping(oddsType: OddsType): Promise<OddsMapping[]>;
  getGameOdds(gameId: string): Promise<OddsMapping | null>;
  getPlayerPropOdds(playerId: string, season?: number): Promise<OddsMapping[]>;
  getLineHistory(gameId: string): Promise<OddsMapping['lineHistory']>;
  
  // Cache & Updates
  refresh(): Promise<void>;
  clearCache(): Promise<void>;
  getLastUpdate(dataType: 'schedule' | 'players' | 'stats' | 'injuries' | 'odds'): Date | null;
  
  // Health Check
  healthCheck(): Promise<{ healthy: boolean; message: string; lastSync?: Date }>;
}
