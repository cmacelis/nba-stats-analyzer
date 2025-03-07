import React from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { Player } from '../../types/nba';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface StatsRadarChartProps {
  player1: Player;
  player2: Player;
}

const StatsRadarChart: React.FC<StatsRadarChartProps> = ({ player1, player2 }) => {
  const normalizeValue = (value: number, max: number) => (value / max) * 100;

  const maxValues = {
    points: 35,
    assists: 12,
    rebounds: 15,
    steals: 3,
    blocks: 3,
    fieldGoalPercentage: 100
  };

  const data = {
    labels: ['Points', 'Assists', 'Rebounds', 'Steals', 'Blocks', 'FG%'],
    datasets: [
      {
        label: player1.fullName,
        data: [
          normalizeValue(player1.stats?.points || 0, maxValues.points),
          normalizeValue(player1.stats?.assists || 0, maxValues.assists),
          normalizeValue(player1.stats?.rebounds || 0, maxValues.rebounds),
          normalizeValue(player1.stats?.steals || 0, maxValues.steals),
          normalizeValue(player1.stats?.blocks || 0, maxValues.blocks),
          player1.stats?.fieldGoalPercentage || 0,
        ],
        backgroundColor: 'rgba(30, 60, 114, 0.2)',
        borderColor: 'rgba(30, 60, 114, 1)',
        borderWidth: 1,
      },
      {
        label: player2.fullName,
        data: [
          normalizeValue(player2.stats?.points || 0, maxValues.points),
          normalizeValue(player2.stats?.assists || 0, maxValues.assists),
          normalizeValue(player2.stats?.rebounds || 0, maxValues.rebounds),
          normalizeValue(player2.stats?.steals || 0, maxValues.steals),
          normalizeValue(player2.stats?.blocks || 0, maxValues.blocks),
          player2.stats?.fieldGoalPercentage || 0,
        ],
        backgroundColor: 'rgba(46, 125, 50, 0.2)',
        borderColor: 'rgba(46, 125, 50, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: {
          display: false,
        },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  return (
    <div className="radar-chart">
      <Radar data={data} options={options} />
    </div>
  );
};

export default StatsRadarChart; 