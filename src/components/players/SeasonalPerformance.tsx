import * as React from 'react';
import { Player, PlayerStats } from '../../types/nba';
import { Bar } from 'react-chartjs-2';
import './SeasonalPerformance.css';

interface SeasonalPerformanceProps {
  player: Player;
  seasonStats: PlayerStats[];
}

const SeasonalPerformance: React.FC<SeasonalPerformanceProps> = ({
  player,
  seasonStats
}) => {
  const [selectedStat, setSelectedStat] = React.useState('points');

  const chartData = React.useMemo(() => ({
    labels: seasonStats.map(stat => stat.season),
    datasets: [{
      label: `${player.fullName}'s ${selectedStat.toUpperCase()}`,
      data: seasonStats.map(stat => stat[selectedStat as keyof PlayerStats] as number),
      backgroundColor: 'rgba(30, 60, 114, 0.5)',
      borderColor: 'rgba(30, 60, 114, 1)',
      borderWidth: 1
    }]
  }), [seasonStats, selectedStat, player.fullName]);

  return (
    <div className="seasonal-performance">
      <div className="stat-selector">
        <select value={selectedStat} onChange={(e) => setSelectedStat(e.target.value)}>
          <option value="points">Points</option>
          <option value="assists">Assists</option>
          <option value="rebounds">Rebounds</option>
        </select>
      </div>
      <div className="performance-chart">
        <Bar data={chartData} />
      </div>
    </div>
  );
};

export default SeasonalPerformance; 