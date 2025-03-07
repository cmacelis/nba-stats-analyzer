import { PlayerStats } from '../types/nba';

export class StatsValidator {
  static validateStats(stats: Partial<PlayerStats>): string[] {
    const errors: string[] = [];

    // Required fields
    const requiredFields: (keyof PlayerStats)[] = [
      'points', 'assists', 'rebounds', 'steals', 'blocks',
      'fieldGoalPercentage', 'minutesPerGame', 'gamesPlayed'
    ];

    requiredFields.forEach(field => {
      if (stats[field] === undefined || stats[field] === null) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    // Range validations
    if (stats.points !== undefined && (stats.points < 0 || stats.points > 100)) {
      errors.push('Points must be between 0 and 100');
    }

    if (stats.fieldGoalPercentage !== undefined && 
        (stats.fieldGoalPercentage < 0 || stats.fieldGoalPercentage > 100)) {
      errors.push('Field goal percentage must be between 0 and 100');
    }

    if (stats.minutesPerGame !== undefined && 
        (stats.minutesPerGame < 0 || stats.minutesPerGame > 48)) {
      errors.push('Minutes per game must be between 0 and 48');
    }

    return errors;
  }

  static sanitizeStats(stats: PlayerStats): PlayerStats {
    return {
      ...stats,
      points: Math.max(0, Math.min(100, stats.points)),
      fieldGoalPercentage: Math.max(0, Math.min(100, stats.fieldGoalPercentage)),
      minutesPerGame: Math.max(0, Math.min(48, stats.minutesPerGame)),
      gamesPlayed: Math.max(0, stats.gamesPlayed)
    };
  }

  static validateAdvancedStats(stats: PlayerStats): string[] {
    const errors = this.validateStats(stats);

    // Validate shooting percentages
    const percentageFields: (keyof PlayerStats)[] = [
      'fieldGoalPercentage',
      'threePointPercentage',
      'freeThrowPercentage'
    ];

    percentageFields.forEach(field => {
      const value = stats[field];
      if (value !== undefined) {
        if (value < 0 || value > 100) {
          errors.push(`${field} must be between 0 and 100`);
        }
        if (Number.isNaN(value)) {
          errors.push(`${field} must be a valid number`);
        }
      }
    });

    // Validate logical constraints
    if (stats.offensiveRebounds + stats.defensiveRebounds !== stats.rebounds) {
      errors.push('Total rebounds must equal offensive + defensive rebounds');
    }

    if (stats.minutesPerGame * stats.gamesPlayed > 3936) { // 82 games * 48 minutes
      errors.push('Total minutes played exceeds maximum possible in a season');
    }

    // Validate statistical outliers
    const outlierChecks = [
      { field: 'points', max: 70, message: 'Unusually high points per game' },
      { field: 'assists', max: 15, message: 'Unusually high assists per game' },
      { field: 'rebounds', max: 25, message: 'Unusually high rebounds per game' },
      { field: 'blocks', max: 5, message: 'Unusually high blocks per game' },
      { field: 'steals', max: 5, message: 'Unusually high steals per game' }
    ];

    outlierChecks.forEach(({ field, max, message }) => {
      if (stats[field as keyof PlayerStats] > max) {
        errors.push(`Warning: ${message}`);
      }
    });

    return errors;
  }

  static validateStatsTrend(currentStats: PlayerStats, previousStats: PlayerStats): string[] {
    const warnings: string[] = [];
    const significantChange = 0.5; // 50% change threshold

    Object.keys(currentStats).forEach(key => {
      const field = key as keyof PlayerStats;
      const current = currentStats[field];
      const previous = previousStats[field];

      if (typeof current === 'number' && typeof previous === 'number') {
        const percentChange = Math.abs((current - previous) / previous);
        if (percentChange > significantChange) {
          warnings.push(`Significant change in ${field}: ${(percentChange * 100).toFixed(1)}% difference`);
        }
      }
    });

    return warnings;
  }
} 