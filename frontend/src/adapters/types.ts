/**
 * Phase 0.5 — ILeagueAdapter interface + core models.
 *
 * Scoped to the subset of methods actually used by current NBA endpoints.
 * Phase 1+ will expand this interface when WNBA / additional leagues are added.
 *
 * Moved from: docs/league-adapters/phase0/PHASE_0_LeagueAdapter_Interface.ts
 */

// ─── Shared enums ────────────────────────────────────────────────────────────

export type StatKey = 'pts' | 'pra';

// ─── Core models ─────────────────────────────────────────────────────────────

export interface GameTeam {
  full_name: string;
  abbreviation: string;
}

export interface Game {
  id: number;
  date: string;
  home_team: GameTeam;
  visitor_team: GameTeam;
  home_team_score: number;
  visitor_team_score: number;
  status: string;
  period?: number;
  time?: string;
}

export interface PlayerSearchResult {
  id: number;
  first_name: string;
  last_name: string;
  position?: string;
  team?: GameTeam;
  photo_url?: string | null;
}

export interface EdgeEntry {
  player_id: number;
  player_name: string;
  team: string;
  team_abbrev: string;
  photo_url: string | null;
  season_avg: number;
  recent_avg: number;
  delta: number;
  last5: number[];
  games_played: number;
}

export interface StatContext {
  propLine: number | null;
  recentAvg5: number;
  recentAvg10: number;
  stdDev: number;
  overHitRate: number;
  streak: number;
  recentGames: number[];
  gamesPlayed: number;
}

export interface CompareResult {
  player1: unknown;
  player2: unknown;
  head_to_head: unknown[];
  effectiveSeason: number;
}

// ─── Adapter interface ────────────────────────────────────────────────────────

/**
 * ILeagueAdapter — contract every league adapter must satisfy.
 *
 * Phase 0.5 exposes only the six methods wired to live NBA endpoints:
 *   playerSearch, games, playerStats, compare, photo, edgeFeed
 *
 * Additional methods (injuries, odds, team stats, …) will be added in Phase 1.
 */
export interface ILeagueAdapter {
  /** Search players by name string. Returns up to `limit` results. */
  playerSearch(query: string, limit?: number): Promise<PlayerSearchResult[]>;

  /** Upcoming / in-progress games (next N days, non-final). */
  games(): Promise<Game[]>;

  /**
   * Rich stat context for a player — recent averages, std dev, hit rate, streak.
   * Used by the research and edge-feed pipelines.
   */
  playerStats(playerName: string, propType: StatKey): Promise<StatContext>;

  /** Head-to-head season average comparison for two players. */
  compare(id1: number, id2: number, season: number): Promise<CompareResult>;

  /** Resolve NBA CDN headshot URL for a player by display name. Null if unknown. */
  photo(playerName: string): Promise<string | null>;

  /** Full edge-detection feed: top players sorted by |recent − season| delta. */
  edgeFeed(options: {
    stat: StatKey;
    minMinutes: number;
    season: number;
  }): Promise<EdgeEntry[]>;
}
