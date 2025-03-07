import { PlayerStats } from '../types/player';

export function calculateAdvancedStats(stats: PlayerStats) {
  // Calculate True Shooting Percentage
  const ts = calculateTrueShootingPercentage(stats);
  
  // Calculate Effective Field Goal Percentage
  const efg = calculateEffectiveFieldGoalPercentage(stats);
  
  // Calculate Usage Rate
  const usg = calculateUsageRate(stats);
  
  // Calculate Offensive Rating
  const ortg = calculateOffensiveRating(stats);
  
  // Calculate Defensive Rating
  const drtg = calculateDefensiveRating(stats);
  
  // Calculate Box Plus/Minus
  const bpm = calculateBoxPlusMinus(stats);
  
  // Calculate Win Shares per 48 minutes
  const ws48 = calculateWinSharesPer48(stats);
  
  // Calculate Value Over Replacement Player
  const vorp = calculateVORP(stats);
  
  // Calculate Player Efficiency Rating
  const per = stats.playerEfficiencyRating || calculatePER(stats);
  
  return {
    per,
    ts,
    efg,
    usg,
    ortg,
    drtg,
    bpm,
    ws48,
    vorp
  };
}

function calculateTrueShootingPercentage(stats: PlayerStats): number {
  const pointsPerFGA = stats.points / stats.fieldGoalsAttempted;
  return (pointsPerFGA / 2) * 100;
}

function calculateEffectiveFieldGoalPercentage(stats: PlayerStats): number {
  if (stats.fieldGoalsAttempted === 0) return 0;
  
  // Assuming 3-pointers made is approximately 30% of field goals made for estimation
  const threePtMade = stats.fieldGoalsMade * 0.3;
  return ((stats.fieldGoalsMade + 0.5 * threePtMade) / stats.fieldGoalsAttempted) * 100;
}

function calculateUsageRate(stats: PlayerStats): number {
  // Simplified usage rate calculation
  return ((stats.fieldGoalsAttempted + 0.44 * stats.freeThrowsAttempted + stats.turnovers) / stats.minutesPerGame) * 100;
}

function calculateOffensiveRating(stats: PlayerStats): number {
  // Simplified offensive rating
  return (stats.points * 100) / (stats.fieldGoalsAttempted + 0.44 * stats.freeThrowsAttempted + stats.turnovers);
}

function calculateDefensiveRating(stats: PlayerStats): number {
  // Use the defensive rating from the stats or calculate a simplified version
  return stats.defensiveRating || 100 - ((stats.steals + stats.blocks) * 0.5);
}

function calculateBoxPlusMinus(stats: PlayerStats): number {
  // Simplified BPM calculation
  const rawBPM = (
    (stats.points * 0.1) +
    (stats.rebounds * 0.1) +
    (stats.assists * 0.2) +
    (stats.steals * 0.3) +
    (stats.blocks * 0.3) -
    (stats.turnovers * 0.3) -
    (stats.personalFouls * 0.1)
  ) / stats.minutesPerGame;
  
  return rawBPM * 10;
}

function calculateWinSharesPer48(stats: PlayerStats): number {
  // Simplified Win Shares per 48 minutes
  const offensiveWS = (stats.points * 0.037 + stats.assists * 0.14) / stats.minutesPerGame;
  const defensiveWS = (stats.steals * 0.14 + stats.blocks * 0.1 + stats.defensiveRebounds * 0.034) / stats.minutesPerGame;
  return (offensiveWS + defensiveWS) * 48 / 10;
}

function calculateVORP(stats: PlayerStats): number {
  // Simplified VORP calculation
  return (calculateBoxPlusMinus(stats) - 2) * (stats.minutesPerGame / 48) * (stats.gamesPlayed / 82);
}

function calculatePER(stats: PlayerStats): number {
  // Simplified PER calculation
  return (
    (stats.points * 0.5) +
    (stats.rebounds * 0.5) +
    (stats.assists * 0.5) +
    (stats.steals * 1.0) +
    (stats.blocks * 1.0) -
    (stats.turnovers * 0.5) -
    ((stats.fieldGoalsAttempted - stats.fieldGoalsMade) * 0.5) -
    ((stats.freeThrowsAttempted - stats.freeThrowsMade) * 0.2)
  ) / stats.minutesPerGame * 10;
} 