export interface Player {
  id: string;
  fullName: string;
  team: string;
  position: string;
  jerseyNumber: string;
  height: string;
  weight: string;
  age: number;
  experience: number;
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
  trueShootingPercentage?: number;
  playerEfficiencyRating?: number;
} 