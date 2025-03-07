export interface Player {
  id: number;
  name: string;
  team: string;
  position: string;
}

export interface PlayerStats {
  points: number;
  assists: number;
  rebounds: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fieldGoalPercentage: number;
  threePointPercentage: number;
  freeThrowPercentage: number;
  gamesPlayed: number;
  minutesPerGame: number;
  plusMinus: number;
  playerEfficiencyRating: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
  offensiveRebounds: number;
  defensiveRebounds: number;
  personalFouls: number;
  defensiveRating: number;
  usageRate?: number;
  trueShootingPercentage?: number;
}

export interface ComparisonData {
  matchups: number;
  player1Wins: number;
  player2Wins: number;
  averagePointDiff: number;
  headToHeadStats: {
    player1: PlayerStats;
    player2: PlayerStats;
  };
  lastMatchup?: {
    date: string;
    winner: number;
    player1Points: number;
    player2Points: number;
    gameId: number;
  };
}

export interface SeasonStatsData extends PlayerStats {
  season: string;
  team?: string;
  winPercentage?: number;
  playoffAppearance?: boolean;
  gamesStarted: number;
  awards?: { season: string; award: string }[];
}

export interface SeasonStats {
  seasons: SeasonStatsData[];
  careerHighs: {
    points: { value: number; date: string; opponent: string };
    assists: { value: number; date: string; opponent: string };
    rebounds: { value: number; date: string; opponent: string };
  };
  points: number;
  assists: number;
  rebounds: number;
}

export interface PlayerHistory {
  matchups: Matchup[];
  seasons: SeasonStatsData[];
  careerHighs: {
    points: { value: number; date: string; opponent: string };
    assists: { value: number; date: string; opponent: string };
    rebounds: { value: number; date: string; opponent: string };
    steals: { value: number; date: string; opponent: string };
    blocks: { value: number; date: string; opponent: string };
  };
  awards: {
    season: string;
    award: string;
  }[];
}

export interface Matchup {
  date: string;
  type: 'regular' | 'playoffs';
  player1Score: number;
  player2Score: number;
  result: string;
}

export type TrendDirection = 'stable' | 'improving' | 'declining';

export interface StatTrend {
  direction: TrendDirection;
  percentage: number;
  confidence: number;
} 