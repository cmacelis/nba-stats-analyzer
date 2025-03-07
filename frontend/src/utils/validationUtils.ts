import { PlayerStats } from '../types/player';
import { ValidationResult } from '../types/validation';
import { ValidationRule, ValidationConfig } from '../types/validation';

export const calculateZScore = (value: number, mean: number, stdDev: number): number => {
  return (value - mean) / stdDev;
};

export const detectOutliers = (
  values: number[], 
  method: 'iqr' | 'zscore' | 'modifiedZscore',
  threshold: number
): boolean => {
  switch (method) {
    case 'iqr': {
      const sorted = [...values].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1;
      const lowerBound = q1 - threshold * iqr;
      const upperBound = q3 + threshold * iqr;
      return values.some(v => v < lowerBound || v > upperBound);
    }
    case 'zscore': {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(
        values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
      );
      return values.some(v => Math.abs((v - mean) / stdDev) > threshold);
    }
    case 'modifiedZscore': {
      const median = [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
      const mad = values.reduce((sum, v) => sum + Math.abs(v - median), 0) / values.length;
      return values.some(v => Math.abs(0.6745 * (v - median) / mad) > threshold);
    }
    default:
      return false;
  }
};

export const validateStats = (
  stats: PlayerStats,
  validations: ValidationConfig
): ValidationResult => {
  const errors: string[] = [];

  Object.entries(stats).forEach(([key, value]) => {
    const rules = validations[key];
    if (rules) {
      rules.forEach((rule: ValidationRule) => {
        if (!rule.test(value)) {
          errors.push(rule.message);
        }
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Add other validation helper functions... 