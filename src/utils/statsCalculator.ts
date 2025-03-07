import { PlayerStats } from '../types/nba';

export class StatsCalculator {
  static calculateEfficiency(stats: PlayerStats): number {
    return (
      (stats.points + stats.rebounds + stats.assists + stats.steals + stats.blocks) -
      ((stats.turnovers || 0) + (stats.personalFouls || 0))
    );
  }

  static calculateTrueShootingPercentage(stats: PlayerStats): number {
    const pointsPerShot = stats.points / (2 * ((stats.fieldGoalPercentage / 100) * stats.points));
    return pointsPerShot * 100;
  }

  static calculateRelativePerformance(playerStats: PlayerStats, leagueAverage: PlayerStats): {
    [key in keyof PlayerStats]?: number;
  } {
    const performance: { [key: string]: number } = {};
    
    Object.keys(playerStats).forEach(key => {
      const playerValue = playerStats[key as keyof PlayerStats];
      const leagueValue = leagueAverage[key as keyof PlayerStats];
      
      if (typeof playerValue === 'number' && typeof leagueValue === 'number') {
        performance[key] = ((playerValue - leagueValue) / leagueValue) * 100;
      }
    });

    return performance;
  }

  static calculateSeasonalTrends(seasonStats: PlayerStats[]): {
    improving: string[];
    declining: string[];
    stable: string[];
  } {
    if (seasonStats.length < 2) {
      return { improving: [], declining: [], stable: [] };
    }

    const trends: { [key: string]: string[] } = {
      improving: [],
      declining: [],
      stable: []
    };

    const metrics = ['points', 'assists', 'rebounds', 'steals', 'blocks'];
    const latestSeason = seasonStats[0];
    const previousSeason = seasonStats[1];

    metrics.forEach(metric => {
      const current = latestSeason[metric as keyof PlayerStats] as number;
      const previous = previousSeason[metric as keyof PlayerStats] as number;
      const percentChange = ((current - previous) / previous) * 100;

      if (percentChange > 5) {
        trends.improving.push(metric);
      } else if (percentChange < -5) {
        trends.declining.push(metric);
      } else {
        trends.stable.push(metric);
      }
    });

    return trends as { improving: string[]; declining: string[]; stable: string[] };
  }

  static getPerformanceGrade(stats: PlayerStats): {
    overall: string;
    scoring: string;
    playmaking: string;
    defense: string;
  } {
    const gradeScale = (value: number, max: number): string => {
      const percentage = (value / max) * 100;
      if (percentage >= 90) return 'A+';
      if (percentage >= 80) return 'A';
      if (percentage >= 70) return 'B+';
      if (percentage >= 60) return 'B';
      if (percentage >= 50) return 'C+';
      if (percentage >= 40) return 'C';
      return 'D';
    };

    const scoring = gradeScale(stats.points, 30);
    const playmaking = gradeScale(stats.assists, 10);
    const defense = gradeScale((stats.steals + stats.blocks) / 2, 2);

    const overallScore = (
      (stats.points / 30) * 0.4 +
      (stats.assists / 10) * 0.3 +
      ((stats.steals + stats.blocks) / 4) * 0.3
    ) * 100;

    return {
      overall: gradeScale(overallScore, 100),
      scoring,
      playmaking,
      defense
    };
  }
} 