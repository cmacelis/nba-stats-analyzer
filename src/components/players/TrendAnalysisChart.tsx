import * as React from 'react';
import { Line } from 'react-chartjs-2';
import { Player, PlayerStats } from '../../types/nba';
import { AdvancedStatsCalculator } from '../../utils/AdvancedStatsCalculator';
import './TrendAnalysisChart.css';

interface TrendAnalysisChartProps {
  player1: Player;
  player2: Player;
  seasonStats1: PlayerStats[];
  seasonStats2: PlayerStats[];
}

const TrendAnalysisChart: React.FC<TrendAnalysisChartProps> = ({
  player1,
  player2,
  seasonStats1,
  seasonStats2
}) => {
  const [selectedMetric, setSelectedMetric] = React.useState<string>('per');

  const getMetricData = (stats: PlayerStats[]) => {
    return stats.map(stat => {
      const advancedStats = AdvancedStatsCalculator.getAdvancedStats(stat);
      return advancedStats[selectedMetric as keyof typeof advancedStats];
    });
  };

  const chartData = {
    labels: seasonStats1.map(s => s.season),
    datasets: [
      {
        label: player1.fullName,
        data: getMetricData(seasonStats1),
        borderColor: '#1e3c72',
        fill: false
      },
      {
        label: player2.fullName,
        data: getMetricData(seasonStats2),
        borderColor: '#ff6384',
        fill: false
      }
    ]
  };

  const metrics = [
    { value: 'per', label: 'Player Efficiency Rating' },
    { value: 'trueShootingPercentage', label: 'True Shooting %' },
    { value: 'winShares', label: 'Win Shares' },
    { value: 'vorp', label: 'Value Over Replacement' },
    { value: 'bpm', label: 'Box Plus/Minus' }
  ];

  return (
    <div className="trend-analysis-chart">
      <div className="metric-selector">
        <label>Select Metric:</label>
        <select 
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value)}
        >
          {metrics.map(metric => (
            <option key={metric.value} value={metric.value}>
              {metric.label}
            </option>
          ))}
        </select>
      </div>

      <div className="chart-container">
        <Line 
          data={chartData}
          options={{
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: metrics.find(m => m.value === selectedMetric)?.label
              },
              tooltip: {
                mode: 'index',
                intersect: false,
              }
            },
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }}
        />
      </div>
    </div>
  );
};

export default TrendAnalysisChart; 