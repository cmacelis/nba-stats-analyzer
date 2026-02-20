import { Player, PlayerStats } from '../types/player';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapApiPlayerToPlayer(apiPlayer: any): Player {
  return {
    id: apiPlayer.id,
    name: `${apiPlayer.first_name} ${apiPlayer.last_name}`,
    team: apiPlayer.team?.full_name || 'Free Agent',
    position: apiPlayer.position || 'N/A'
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapApiStatsToPlayerStats(apiStats: any): PlayerStats {
  if (!apiStats) {
    return createEmptyPlayerStats();
  }
  
  return {
    points: apiStats.pts || 0,
    assists: apiStats.ast || 0,
    rebounds: apiStats.reb || 0,
    steals: apiStats.stl || 0,
    blocks: apiStats.blk || 0,
    turnovers: apiStats.turnover || 0,
    fieldGoalPercentage: apiStats.fg_pct ? apiStats.fg_pct * 100 : 0,
    threePointPercentage: apiStats.fg3_pct ? apiStats.fg3_pct * 100 : 0,
    freeThrowPercentage: apiStats.ft_pct ? apiStats.ft_pct * 100 : 0,
    gamesPlayed: apiStats.games_played || 0,
    minutesPerGame: apiStats.min ? parseFloat(apiStats.min) : 0,
    plusMinus: 0, // Not provided by API
    playerEfficiencyRating: calculatePER(apiStats),
    fieldGoalsMade: apiStats.fgm || 0,
    fieldGoalsAttempted: apiStats.fga || 0,
    freeThrowsMade: apiStats.ftm || 0,
    freeThrowsAttempted: apiStats.fta || 0,
    offensiveRebounds: apiStats.oreb || 0,
    defensiveRebounds: apiStats.dreb || 0,
    personalFouls: apiStats.pf || 0,
    defensiveRating: 0, // Not provided by API
    usageRate: calculateUsageRate(apiStats),
    trueShootingPercentage: calculateTrueShootingPercentage(apiStats)
  };
}

function createEmptyPlayerStats(): PlayerStats {
  return {
    points: 0,
    assists: 0,
    rebounds: 0,
    steals: 0,
    blocks: 0,
    turnovers: 0,
    fieldGoalPercentage: 0,
    threePointPercentage: 0,
    freeThrowPercentage: 0,
    gamesPlayed: 0,
    minutesPerGame: 0,
    plusMinus: 0,
    playerEfficiencyRating: 0,
    fieldGoalsMade: 0,
    fieldGoalsAttempted: 0,
    freeThrowsMade: 0,
    freeThrowsAttempted: 0,
    offensiveRebounds: 0,
    defensiveRebounds: 0,
    personalFouls: 0,
    defensiveRating: 0,
    usageRate: 0,
    trueShootingPercentage: 0
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calculatePER(apiStats: any): number {
  // Simplified PER calculation
  if (!apiStats) return 0;
  
  const minutes = apiStats.min ? parseFloat(apiStats.min) : 0;
  if (minutes === 0) return 0;
  
  return (
    (apiStats.pts * 0.5) +
    (apiStats.reb * 0.5) +
    (apiStats.ast * 0.5) +
    (apiStats.stl * 1.0) +
    (apiStats.blk * 1.0) -
    (apiStats.turnover * 0.5) -
    ((apiStats.fga - apiStats.fgm) * 0.5) -
    ((apiStats.fta - apiStats.ftm) * 0.2)
  ) / minutes * 10;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calculateUsageRate(apiStats: any): number {
  if (!apiStats) return 0;
  
  const minutes = apiStats.min ? parseFloat(apiStats.min) : 0;
  if (minutes === 0) return 0;
  
  return ((apiStats.fga + 0.44 * apiStats.fta + apiStats.turnover) / minutes) * 100;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calculateTrueShootingPercentage(apiStats: any): number {
  if (!apiStats) return 0;
  
  const pointsPerFGA = apiStats.pts / apiStats.fga;
  return (pointsPerFGA / 2) * 100;
} 