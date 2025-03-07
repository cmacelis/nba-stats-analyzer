import { StatCategory } from '../types/stats';

export const statCategories: StatCategory[] = [
  {
    category: 'Scoring',
    description: 'Points production and shooting efficiency',
    stats: [
      { key: 'points', label: 'Points', format: '0.0', baseline: 15 },
      { key: 'fieldGoalPercentage', label: 'FG%', format: '0.0', suffix: '%', baseline: 45 },
      { key: 'threePointPercentage', label: '3P%', format: '0.0', suffix: '%', baseline: 35 },
      { key: 'freeThrowPercentage', label: 'FT%', format: '0.0', suffix: '%', baseline: 75 }
    ]
  },
  {
    category: 'Playmaking',
    description: 'Ball handling and passing ability',
    stats: [
      { key: 'assists', label: 'Assists', format: '0.0', baseline: 3.5 },
      { key: 'turnovers', label: 'Turnovers', format: '0.0', baseline: 2.0, isInverse: true }
    ]
  },
  {
    category: 'Rebounding',
    description: 'Ability to secure possessions',
    stats: [
      { key: 'rebounds', label: 'Total Rebounds', format: '0.0', baseline: 5 },
      { key: 'offensiveRebounds', label: 'Offensive', format: '0.0', baseline: 1 },
      { key: 'defensiveRebounds', label: 'Defensive', format: '0.0', baseline: 4 }
    ]
  }
];

export const statConfig = {
  stats: [
    { key: 'points', label: 'Points', higherIsBetter: true },
    { key: 'assists', label: 'Assists', higherIsBetter: true },
    { key: 'rebounds', label: 'Rebounds', higherIsBetter: true },
    { key: 'fieldGoalPercentage', label: 'Field Goal %', higherIsBetter: true, isPercentage: true },
    { key: 'threePointPercentage', label: '3PT %', higherIsBetter: true, isPercentage: true },
    { key: 'turnovers', label: 'Turnovers', higherIsBetter: false },
    // Add more stats as needed...
  ],
}; 