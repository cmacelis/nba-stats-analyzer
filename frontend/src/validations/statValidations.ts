import { 
  AdvancedPlayStyleValidation,
  HistoricalComparisonValidation,
  ContextualPerformanceValidation,
  ValidationConfig
} from '../types/validation';

export const advancedPlayStyleValidations: Record<string, AdvancedPlayStyleValidation> = {
  eliteScorer: {
    type: 'advancedPlayStyle',
    style: 'scorer',
    message: 'Advanced scoring metrics do not match elite profile',
    confidenceInterval: 0.95,
    sampleSize: 20,
    calculateZScore: (value, mean, stdDev) => (value - mean) / stdDev,
    requiredMetrics: [
      { metric: 'points', threshold: 20, weight: 0.4 },
      { metric: 'fieldGoalPercentage', threshold: 45, weight: 0.3 },
      { metric: 'trueShootingPercentage', threshold: 55, weight: 0.3 }
    ],
    playstyleMetrics: {
      primary: [
        { metric: 'points', threshold: 20, weight: 0.4 },
        { metric: 'fieldGoalPercentage', threshold: 45, weight: 0.3 }
      ],
      secondary: [
        { metric: 'freeThrowPercentage', threshold: 75, weight: 0.2 },
        { metric: 'threePointPercentage', threshold: 35, weight: 0.1 }
      ]
    },
    roleSpecificBenchmarks: {
      role: 'scorer',
      minimumScore: 80,
      idealRatios: {
        points: 20,
        fieldGoalPercentage: 45,
        trueShootingPercentage: 55,
        freeThrowPercentage: 75
      }
    },
    styleScore: (stats) => {
      const primaryScore = stats.points * 0.4 + stats.fieldGoalPercentage * 0.3;
      const secondaryScore = stats.freeThrowPercentage * 0.2 + stats.threePointPercentage * 0.1;
      return (primaryScore + secondaryScore) * 10;
    }
  }
};

export const historicalComparisonValidations: Record<string, HistoricalComparisonValidation> = {
  modernEra: {
    type: 'historicalComparison',
    era: 'modern',
    message: 'Performance deviates from historical comparables',
    confidenceInterval: 0.95,
    sampleSize: 100,
    calculateZScore: (value, mean, stdDev) => (value - mean) / stdDev,
    similarityThreshold: 0.85,
    comparablePlayers: [],
    adjustmentFactors: [
      { stat: 'threePointPercentage', factor: 1.1 },
      { stat: 'fieldGoalPercentage', factor: 0.95 }
    ]
  }
};

export const contextualPerformanceValidations: Record<string, ContextualPerformanceValidation> = {
  situational: {
    type: 'contextualPerformance',
    message: 'Contextual performance shows unusual patterns',
    confidenceInterval: 0.95,
    sampleSize: 40,
    calculateZScore: (value, mean, stdDev) => (value - mean) / stdDev,
    contexts: [
      { type: 'home', expectedAdjustment: 1.05, tolerance: 0.1 },
      { type: 'away', expectedAdjustment: 0.95, tolerance: 0.1 }
    ],
    strengthOfOpposition: {
      weak: 1.1,
      average: 1.0,
      strong: 0.9
    }
  }
};

export const statValidations: ValidationConfig = {
  points: [
    {
      test: (value) => value >= 0,
      message: 'Points cannot be negative'
    },
    {
      test: (value) => value <= 100,
      message: 'Points per game cannot exceed 100'
    }
  ],
  fieldGoalPercentage: [
    {
      test: (value) => value >= 0 && value <= 100,
      message: 'Field goal percentage must be between 0 and 100'
    }
  ],
  threePointPercentage: [
    {
      test: (value) => value >= 0 && value <= 100,
      message: 'Three point percentage must be between 0 and 100'
    }
  ],
  freeThrowPercentage: [
    {
      test: (value) => value >= 0 && value <= 100,
      message: 'Free throw percentage must be between 0 and 100'
    }
  ],
  assists: [
    {
      test: (value) => value >= 0,
      message: 'Assists cannot be negative'
    },
    {
      test: (value) => value <= 30,
      message: 'Assists per game cannot exceed 30'
    }
  ],
  rebounds: [
    {
      test: (value) => value >= 0,
      message: 'Rebounds cannot be negative'
    },
    {
      test: (value) => value <= 40,
      message: 'Rebounds per game cannot exceed 40'
    }
  ]
}; 