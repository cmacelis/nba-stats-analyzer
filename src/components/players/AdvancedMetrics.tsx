import * as React from 'react';
import { Player } from '../../types/nba';
import { Radar } from 'react-chartjs-2';
import './AdvancedMetrics.css';

interface AdvancedMetricsProps {
  player1: Player;
  player2: Player;
}

const AdvancedMetrics: React.FC<AdvancedMetricsProps> = ({ player1, player2 }) => {
  const data = {
    labels: ['PER', 'TS%', 'WS', 'BPM', 'VORP'],
    datasets: [
      {
        label: player1.fullName,
        data: [player1.per, player1.tsPercentage, player1.winShares, player1.bpm, player1.vorp],
        backgroundColor: 'rgba(30, 60, 114, 0.2)',
        borderColor: 'rgba(30, 60, 114, 1)',
        borderWidth: 1,
      },
      {
        label: player2.fullName,
        data: [player2.per, player2.tsPercentage, player2.winShares, player2.bpm, player2.vorp],
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    scale: {
      ticks: { beginAtZero: true },
    },
  };

  return (
    <div className="advanced-metrics">
      <h3>Advanced Metrics</h3>
      <Radar data={data} options={options} />
    </div>
  );
};

export default AdvancedMetrics; 