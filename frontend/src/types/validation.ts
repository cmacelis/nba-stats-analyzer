import { PlayerStats } from './player';

// Base validation types
export interface BaseValidationRule {
  min?: number;
  max?: number;
  required?: boolean;
  validator?: (value: number) => boolean;
  message: string;
}

export interface StatisticalValidation extends BaseValidationRule {
  type: 'statistical';
  confidenceInterval: number;
  sampleSize: number;
  calculateZScore: (value: number, mean: number, stdDev: number) => number;
}

export interface PlayStyleValidation extends Omit<StatisticalValidation, 'type'> {
  type: 'playStyle';
  style: 'scorer' | 'playmaker' | 'defender' | 'allRounder';
  requiredMetrics: {
    metric: keyof PlayerStats;
    threshold: number;
    weight: number;
  }[];
  styleScore: (stats: PlayerStats) => number;
}

export interface AdvancedPlayStyleValidation extends Omit<PlayStyleValidation, 'type'> {
  type: 'advancedPlayStyle';
  playstyleMetrics: {
    primary: {
      metric: keyof PlayerStats;
      threshold: number;
      weight: number;
    }[];
    secondary: {
      metric: keyof PlayerStats;
      threshold: number;
      weight: number;
    }[];
  };
  roleSpecificBenchmarks: {
    role: 'scorer' | 'playmaker' | 'defender' | 'allRounder';
    minimumScore: number;
    idealRatios: Partial<Record<keyof PlayerStats, number>>;
  };
}

export interface HistoricalComparisonValidation extends Omit<StatisticalValidation, 'type'> {
  type: 'historicalComparison';
  era: 'modern' | 'post2000' | 'pre2000';
  similarityThreshold: number;
  comparablePlayers: {
    name: string;
    stats: Partial<PlayerStats>;
    similarity: number;
  }[];
  adjustmentFactors: {
    stat: keyof PlayerStats;
    factor: number;
  }[];
}

export interface ContextualPerformanceValidation extends Omit<StatisticalValidation, 'type'> {
  type: 'contextualPerformance';
  contexts: {
    type: 'home' | 'away' | 'backToBack' | 'playoffs';
    expectedAdjustment: number;
    tolerance: number;
  }[];
  strengthOfOpposition: {
    weak: number;
    average: number;
    strong: number;
  };
}

export interface ValidationRule {
  test: (value: number) => boolean;
  message: string;
}

export interface ValidationConfig {
  [key: string]: ValidationRule[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Add all other validation interfaces... 