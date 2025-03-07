import { PlayerStats } from '../types/nba';

export class AdvancedStatsCalculator {
  static calculatePER(stats: PlayerStats): number {
    // Player Efficiency Rating calculation
    const uPER = (
      stats.points * 85.910 +
      stats.rebounds * 53.897 +
      stats.assists * 34.677 +
      stats.steals * 53.897 +
      stats.blocks * 39.190 -
      (stats.turnovers || 0) * 53.897
    ) / stats.minutesPerGame;

    return uPER * (15 / 30); // League average adjustment
  }

  static calculateTrueShootingPercentage(stats: PlayerStats): number {
    // True Shooting Percentage calculation
    const pointsPerShot = stats.points / (2 * ((stats.fieldGoalPercentage / 100) * stats.points));
    return pointsPerShot * 100;
  }

  static calculateWinShares(stats: PlayerStats): number {
    // Win Shares calculation
    const offensiveWinShares = this.calculateOffensiveWinShares(stats);
    const defensiveWinShares = this.calculateDefensiveWinShares(stats);
    return offensiveWinShares + defensiveWinShares;
  }

  static calculateBoxPlusMinus(stats: PlayerStats): number {
    // Box Plus/Minus calculation
    return (
      (stats.points * 0.8 +
      stats.assists * 1.2 +
      stats.rebounds * 0.7 +
      stats.steals * 1.5 +
      stats.blocks * 1.0 -
      (stats.turnovers || 0) * 1.2) / stats.minutesPerGame
    ) - 2.0; // League average adjustment
  }

  static calculateVORP(stats: PlayerStats): number {
    // Value Over Replacement Player calculation
    const minutesPlayed = stats.minutesPerGame * stats.gamesPlayed;
    const bpm = this.calculateBoxPlusMinus(stats);
    return (bpm + 2.0) * (minutesPlayed / (82 * 48)) * 2.70;
  }

  private static calculateOffensiveWinShares(stats: PlayerStats): number {
    const pointsProduced = stats.points + (stats.assists * 1.5);
    const possessions = stats.minutesPerGame * (stats.gamesPlayed / 48) * 100;
    return (pointsProduced / possessions) * stats.gamesPlayed * 0.1;
  }

  private static calculateDefensiveWinShares(stats: PlayerStats): number {
    const stops = (stats.steals * 1.2) + (stats.blocks * 0.7) + (stats.rebounds * 0.3);
    return (stops / stats.minutesPerGame) * stats.gamesPlayed * 0.1;
  }

  static getAdvancedStats(stats: PlayerStats) {
    return {
      per: this.calculatePER(stats),
      trueShootingPercentage: this.calculateTrueShootingPercentage(stats),
      winShares: this.calculateWinShares(stats),
      boxPlusMinus: this.calculateBoxPlusMinus(stats),
      vorp: this.calculateVORP(stats)
    };
  }
} 