export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  conference: 'East' | 'West';
  division: string;
  city: string;
}

export interface PlayerStats {
  playerId: string;
  season: string;
  games: number;
  gamesStarted: number;
  minutes: number;
  points: number;
  assists: number;
  rebounds: number;
  steals: number;
  blocks: number;
  turnovers: number;
  personalFouls: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  fieldGoalPercentage: number;
  threePointsMade: number;
  threePointsAttempted: number;
  threePointPercentage: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
  freeThrowPercentage: number;
  offensiveRebounds: number;
  defensiveRebounds: number;
  minutesPerGame: number;
  efficiency: number;
  per: number;
  trueShootingPercentage: number;
  winShares: number;
}

export interface GameResult {
  id: string;
  date: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  stats: {
    [playerId: string]: PlayerStats;
  };
}

export interface Player {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  teamId: string;
  position: string;
  height: string;
  weight: number;
  jerseyNumber: string;
  birthDate: string;
  age: number;
  experience: number;
  college?: string;
  country: string;
  draft?: {
    year: number;
    round: number;
    pick: number;
  };
}

export interface ComparisonData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
  }[];
}

export interface FilterOptions {
  position: string;
  conference: string;
  experience: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  team?: string;
  minGames?: number;
  dateRange?: [string, string];
  advancedFilters?: {
    minPoints?: number;
    minEfficiency?: number;
    minPER?: number;
    minWinShares?: number;
  };
  statRanges?: {
    [key: string]: [number, number];
  };
}

export interface AdvancedStats {
  per: number;
  trueShootingPercentage: number;
  effectiveFieldGoalPercentage: number;
  winShares: number;
  boxPlusMinus: number;
  valueOverReplacement: number;
  usagePercentage: number;
  assistPercentage: number;
  reboundPercentage: number;
}

export interface TeamStats {
  teamId: string;
  season: string;
  wins: number;
  losses: number;
  winPercentage: number;
  pointsPerGame: number;
  pointsAllowedPerGame: number;
  rating: number;
}

export interface Matchup {
  gameId: string;
  date: string;
  result: string;
  player1: Player;
  player2: Player;
  player1Stats: PlayerStats;
  player2Stats: PlayerStats;
} 