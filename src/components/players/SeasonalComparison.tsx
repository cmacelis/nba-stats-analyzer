import * as React from 'react';
import { Line } from 'react-chartjs-2';
import { Player, PlayerStats } from '../../types/nba';
import './SeasonalComparison.css';

interface SeasonalComparisonProps {
  player1: Player;
  player2: Player;
  seasonStats1: PlayerStats[];
  seasonStats2: PlayerStats[];
}

const SeasonalComparison: React.FC<SeasonalComparisonProps> = ({
  player1,
  player2,
  seasonStats1,
  seasonStats2
}) => {
  const [selectedStat, setSelectedStat] = React.useState<keyof PlayerStats>('points');

  const stats = [
    { key: 'points', label: 'Points' },
    { key: 'assists', label: 'Assists' },
    { key: 'rebounds', label: 'Rebounds' },
    { key: 'efficiency', label: 'Efficiency' },
    { key: 'per', label: 'PER' }
  ] as const;

  const data = {
    labels: seasonStats1.map(stat => stat.season),
    datasets: [
      {
        label: player1.fullName,
        data: seasonStats1.map(stat => stat[selectedStat]),
        borderColor: 'rgba(30, 60, 114, 1)',
        backgroundColor: 'rgba(30, 60, 114, 0.2)',
        fill: true,
      },
      {
        label: player2.fullName,
        data: seasonStats2.map(stat => stat[selectedStat]),
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        fill: true,
      }
    ]
  };

  const options = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
      }
    }
  };

  return (
    <div className="seasonal-comparison">
      <div className="stat-selector">
        <label htmlFor="stat-select">Compare:</label>
        <select
          id="stat-select"
          value={selectedStat}
          onChange={(e) => setSelectedStat(e.target.value as keyof PlayerStats)}
        >
          {stats.map(({ key, label }) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      <div className="chart-container">
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

export default SeasonalComparison; 