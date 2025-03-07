export interface Player {
  id: number;
  name: string;
  team: string;
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