import type { FilterOptions } from '../types/nba';

interface FilterPreset {
  id: string;
  name: string;
  description: string;
  filters: FilterOptions;
}

export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'scoring-leaders',
    name: 'Scoring Leaders',
    description: 'Top scorers in the league',
    filters: {
      position: 'All',
      conference: 'All',
      experience: 'All',
      sortBy: 'points',
      sortOrder: 'desc'
    }
  },
  {
    id: 'elite-scorers',
    name: 'Elite Scorers',
    description: 'Players averaging 25+ points with high efficiency',
    filters: {
      position: 'All',
      team: 'All',
      minGames: 20,
      dateRange: ['', ''],
      advancedFilters: {
        minPoints: 25,
        minEfficiency: 20,
        minPER: 20
      },
      statRanges: {
        points: [25, 100],
        efficiency: [20, 100]
      },
      sortBy: 'points',
      sortOrder: 'desc',
      conference: 'All',
      experience: 'all'
    }
  },
  {
    id: 'rising-rookies',
    name: 'Rising Rookies',
    description: 'Impressive rookie performers',
    filters: {
      position: 'All',
      team: 'All',
      minGames: 10,
      dateRange: ['', ''],
      advancedFilters: {
        minPER: 15
      },
      statRanges: {},
      sortBy: 'per',
      sortOrder: 'desc',
      conference: 'All',
      experience: 'rookie'
    }
  },
  {
    id: 'efficient-veterans',
    name: 'Efficient Veterans',
    description: 'Veterans with high efficiency and win shares',
    filters: {
      position: 'All',
      team: 'All',
      minGames: 30,
      dateRange: ['', ''],
      advancedFilters: {
        minWinShares: 5,
        minPER: 18
      },
      statRanges: {},
      sortBy: 'winShares',
      sortOrder: 'desc',
      conference: 'All',
      experience: 'veteran'
    }
  }
];

export const getPresetById = (id: string): FilterPreset | undefined => {
  return FILTER_PRESETS.find(preset => preset.id === id);
}; 