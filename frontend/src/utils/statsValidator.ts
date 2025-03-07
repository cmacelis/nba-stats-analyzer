import { PlayerStats } from '../types/player';

export function validatePlayerStats(stats: Partial<PlayerStats>): PlayerStats {
  // Provide default values for missing properties
  return {
    points: stats.points ?? 0,
    assists: stats.assists ?? 0,
    rebounds: stats.rebounds ?? 0,
    steals: stats.steals ?? 0,
    blocks: stats.blocks ?? 0,
    turnovers: stats.turnovers ?? 0,
    fieldGoalPercentage: stats.fieldGoalPercentage ?? 0,
    threePointPercentage: stats.threePointPercentage ?? 0,
    freeThrowPercentage: stats.freeThrowPercentage ?? 0,
    gamesPlayed: stats.gamesPlayed ?? 0,
    minutesPerGame: stats.minutesPerGame ?? 0,
    plusMinus: stats.plusMinus ?? 0,
    playerEfficiencyRating: stats.playerEfficiencyRating ?? 0,
    fieldGoalsMade: stats.fieldGoalsMade ?? 0,
    fieldGoalsAttempted: stats.fieldGoalsAttempted ?? 0,
    freeThrowsMade: stats.freeThrowsMade ?? 0,
    freeThrowsAttempted: stats.freeThrowsAttempted ?? 0,
    offensiveRebounds: stats.offensiveRebounds ?? 0,
    defensiveRebounds: stats.defensiveRebounds ?? 0,
    personalFouls: stats.personalFouls ?? 0,
    defensiveRating: stats.defensiveRating ?? 0
  };
} 