import * as React from 'react';
import { Line } from 'react-chartjs-2';
import { Player, PlayerStats } from '../../types/nba';
import './TrendAnalysis.css';

interface TrendAnalysisProps {
  player1: Player;
  player2: Player;
  seasonStats1: PlayerStats[];
  seasonStats2: PlayerStats[];
}

const TrendAnalysis: React.FC<TrendAnalysisProps> = ({
  player1,
  player2,
  seasonStats1,
  seasonStats2
}) => {
  const [selectedMetric, setSelectedMetric] = React.useState('points');

  const metrics = React.useMemo(() => [
    { key: 'points', label: 'Points', color: '#1e3c72' },
    { key: 'assists', label: 'Assists', color: '#2a5298' },
    { key: 'rebounds', label: 'Rebounds', color: '#4a90e2' }
  ], []);

  const chartData = React.useMemo(() => ({
    labels: seasonStats1.map(stat => stat.season),
    datasets: [
      {
        label: `${player1.fullName} ${metrics.find(m => m.key === selectedMetric)?.label}`,
        data: seasonStats1.map(stat => stat[selectedMetric as keyof PlayerStats] as number),
        borderColor: metrics.find(m => m.key === selectedMetric)?.color,
        fill: false
      },
      {
        label: `${player2.fullName} ${metrics.find(m => m.key === selectedMetric)?.label}`,
        data: seasonStats2.map(stat => stat[selectedMetric as keyof PlayerStats] as number),
        borderColor: metrics.find(m => m.key === selectedMetric)?.color + '80',
        fill: false
      }
    ]
  }), [seasonStats1, seasonStats2, player1.fullName, player2.fullName, selectedMetric, metrics]);

  return (
    <div className="trend-analysis">
      <div className="metric-selector">
        <select value={selectedMetric} onChange={(e) => setSelectedMetric(e.target.value)}>
          {metrics.map(metric => (
            <option key={metric.key} value={metric.key}>
              {metric.label}
            </option>
          ))}
        </select>
      </div>
      <div className="trend-chart">
        <Line data={chartData} />
      </div>
    </div>
  );
};

export default TrendAnalysis; 