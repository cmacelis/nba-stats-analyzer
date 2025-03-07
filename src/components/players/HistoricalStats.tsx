import * as React from 'react';
import { Line } from 'react-chartjs-2';
import { Player, PlayerStats } from '../../types/nba';
import './HistoricalStats.css';

interface HistoricalStatsProps {
  player: Player;
  seasonStats: PlayerStats[];
}

const HistoricalStats: React.FC<HistoricalStatsProps> = ({ player, seasonStats }) => {
  const milestones = React.useMemo(() => {
    return seasonStats.reduce((acc, stats) => {
      // Career milestones
      if (stats.points >= 20) acc.twentyPointGames = (acc.twentyPointGames || 0) + 1;
      if (stats.assists >= 10) acc.tripleDoubles = (acc.tripleDoubles || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [seasonStats]);

  const chartData = {
    labels: seasonStats.map((_, index) => {
      const year = new Date().getFullYear() - index;
      return `${year}-${(year + 1).toString().slice(-2)}`;
    }).reverse(),
    datasets: [
      {
        label: 'Points',
        data: seasonStats.map(stats => stats.points).reverse(),
        borderColor: '#1e3c72',
        fill: false,
      },
      {
        label: 'Efficiency',
        data: seasonStats.map(stats => stats.efficiency).reverse(),
        borderColor: '#2a5298',
        fill: false,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Career Progression'
      }
    }
  };

  return (
    <div className="historical-stats">
      <h3>{player.fullName}'s Career Highlights</h3>
      
      <div className="milestones">
        <div className="milestone-item">
          <span className="milestone-value">{milestones.twentyPointGames || 0}</span>
          <span className="milestone-label">20+ Point Games</span>
        </div>
        <div className="milestone-item">
          <span className="milestone-value">{milestones.tripleDoubles || 0}</span>
          <span className="milestone-label">Triple-Doubles</span>
        </div>
      </div>

      <div className="trend-chart">
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

export default HistoricalStats; 