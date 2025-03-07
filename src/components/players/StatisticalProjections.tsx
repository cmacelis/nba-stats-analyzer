import * as React from 'react';
import { Line } from 'react-chartjs-2';
import { Player, PlayerStats } from '../../types/nba';
import { AdvancedStatsCalculator } from '../../utils/AdvancedStatsCalculator';
import './StatisticalProjections.css';

interface StatisticalProjectionsProps {
  player: Player;
  seasonStats: PlayerStats[];
}

const StatisticalProjections: React.FC<StatisticalProjectionsProps> = ({
  player,
  seasonStats
}) => {
  const [selectedStat, setSelectedStat] = React.useState<string>('points');

  const projections = React.useMemo(() => {
    if (seasonStats.length < 3) return null;

    // Use linear regression for projections
    const calculateProjection = (values: number[]): number => {
      const n = values.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      
      values.forEach((y, x) => {
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
      });

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      
      return slope * n + intercept; // Project next value
    };

    const stats = seasonStats.map(stat => ({
      points: stat.points,
      assists: stat.assists,
      rebounds: stat.rebounds,
      per: AdvancedStatsCalculator.getAdvancedStats(stat).per
    }));

    return {
      points: calculateProjection(stats.map(s => s.points)),
      assists: calculateProjection(stats.map(s => s.assists)),
      rebounds: calculateProjection(stats.map(s => s.rebounds)),
      per: calculateProjection(stats.map(s => s.per))
    };
  }, [seasonStats]);

  if (!projections) {
    return <div className="no-data">Insufficient data for projections</div>;
  }

  const chartData = {
    labels: [...seasonStats.map(s => s.season), 'Projected'],
    datasets: [{
      label: selectedStat.toUpperCase(),
      data: [
        ...seasonStats.map(s => s[selectedStat as keyof PlayerStats]),
        projections[selectedStat as keyof typeof projections]
      ],
      borderColor: '#1e3c72',
      backgroundColor: 'rgba(30, 60, 114, 0.1)',
      fill: true
    }]
  };

  return (
    <div className="statistical-projections">
      <h3>Performance Projections</h3>
      <div className="stat-selector">
        <select 
          value={selectedStat}
          onChange={(e) => setSelectedStat(e.target.value)}
        >
          <option value="points">Points</option>
          <option value="assists">Assists</option>
          <option value="rebounds">Rebounds</option>
          <option value="per">PER</option>
        </select>
      </div>
      <div className="projection-chart">
        <Line data={chartData} />
      </div>
      <div className="projection-summary">
        <h4>Projected Next Season</h4>
        <div className="projection-stats">
          <div className="stat">
            <span className="label">Points</span>
            <span className="value">{projections.points.toFixed(1)}</span>
          </div>
          <div className="stat">
            <span className="label">Assists</span>
            <span className="value">{projections.assists.toFixed(1)}</span>
          </div>
          <div className="stat">
            <span className="label">Rebounds</span>
            <span className="value">{projections.rebounds.toFixed(1)}</span>
          </div>
          <div className="stat">
            <span className="label">PER</span>
            <span className="value">{projections.per.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticalProjections; 