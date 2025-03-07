import * as React from 'react';
import { Line } from 'react-chartjs-2';
import { Player, PlayerStats } from '../../types/nba';
import { AdvancedStatsCalculator } from '../../utils/AdvancedStatsCalculator';
import './HistoricalTrends.css';

interface HistoricalTrendsProps {
  player: Player;
  seasonStats: PlayerStats[];
}

interface Metric {
  key: string;
  label: string;
  color: string;
}

const metrics: Metric[] = [
  { key: 'points', label: 'Points Per Game', color: '#1e3c72' },
  { key: 'efficiency', label: 'Player Efficiency', color: '#2a5298' },
  { key: 'winShares', label: 'Win Shares', color: '#4a90e2' },
  { key: 'per', label: 'PER', color: '#6a1b9a' }
];

const HistoricalTrends: React.FC<HistoricalTrendsProps> = ({ player, seasonStats }) => {
  const [selectedMetric, setSelectedMetric] = React.useState<string>('points');

  const chartData = React.useMemo(() => {
    return {
      labels: seasonStats.map(stat => stat.season),
      datasets: metrics.map(metric => ({
        label: metric.label,
        data: seasonStats.map(stat => stat[metric.key]),
        borderColor: metric.color,
        fill: false
      }))
    };
  }, [seasonStats, metrics, selectedMetric]);

  const chartOptions = React.useMemo(() => ({
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `${player.fullName}'s ${metrics.find(m => m.key === selectedMetric)?.label} Over Time`
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  }), [player.fullName, selectedMetric, metrics]);

  return (
    <div className="historical-trends">
      <div className="metric-selector">
        <label>Select Metric:</label>
        <select 
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value)}
        >
          {metrics.map(metric => (
            <option key={metric.key} value={metric.key}>
              {metric.label}
            </option>
          ))}
        </select>
      </div>

      <div className="trend-chart">
        <Line data={chartData} options={chartOptions} />
      </div>

      <div className="trend-analysis">
        <h4>Trend Analysis</h4>
        <div className="trend-stats">
          {calculateTrendStats(seasonStats, selectedMetric)}
        </div>
      </div>
    </div>
  );
};

const calculateTrendStats = (stats: PlayerStats[], metric: string) => {
  const values = stats.map(stat => {
    if (metric === 'per' || metric === 'winShares') {
      const advancedStats = AdvancedStatsCalculator.getAdvancedStats(stat);
      return Number(advancedStats[metric]);
    }
    return Number(stat[metric as keyof PlayerStats] || 0);
  }).filter((value): value is number => !isNaN(value));

  if (values.length === 0) return null;

  const average = values.reduce((a, b) => a + b, 0) / values.length;
  const trend = values[values.length - 1] - values[0];
  const peak = Math.max(...values);
  const peakIndex = values.indexOf(peak);
  const peakSeason = stats[peakIndex]?.season || 'N/A';

  return (
    <>
      <div className="trend-stat">
        <span className="label">Career Average</span>
        <span className="value">{average.toFixed(1)}</span>
      </div>
      <div className="trend-stat">
        <span className="label">Career Trend</span>
        <span className={`value ${trend >= 0 ? 'positive' : 'negative'}`}>
          {trend >= 0 ? '+' : ''}{trend.toFixed(1)}
        </span>
      </div>
      <div className="trend-stat">
        <span className="label">Peak Season</span>
        <span className="value">{peakSeason} ({peak.toFixed(1)})</span>
      </div>
    </>
  );
};

export default HistoricalTrends; 