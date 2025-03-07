import { ChartData } from 'chart.js';
import { CHART_COLORS, STAT_LABELS } from './constants';
import { Player, PlayerStats } from '../types/nba';

export const createComparisonChartData = (
  player1: Player,
  player2: Player,
  stats1: PlayerStats[],
  stats2: PlayerStats[],
  statKey: keyof PlayerStats
): ChartData => {
  return {
    labels: stats1.map(stat => stat.season),
    datasets: [
      {
        label: player1.fullName,
        data: stats1.map(stat => stat[statKey]),
        borderColor: CHART_COLORS.primary.main,
        backgroundColor: CHART_COLORS.primary.light,
        fill: true
      },
      {
        label: player2.fullName,
        data: stats2.map(stat => stat[statKey]),
        borderColor: CHART_COLORS.secondary.main,
        backgroundColor: CHART_COLORS.secondary.light,
        fill: true
      }
    ]
  };
};

export const formatStatValue = (value: number, statKey: keyof PlayerStats): string => {
  if (statKey.toLowerCase().includes('percentage')) {
    return `${value.toFixed(1)}%`;
  }
  return value.toFixed(1);
}; 