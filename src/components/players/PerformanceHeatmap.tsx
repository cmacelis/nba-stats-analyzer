import * as React from 'react';
import { Player, PlayerStats } from '../../types/nba';
import { AdvancedStatsCalculator } from '../../utils/AdvancedStatsCalculator';
import './PerformanceHeatmap.css';

interface PerformanceHeatmapProps {
  player: Player;
  seasonStats: PlayerStats[];
}

const PerformanceHeatmap: React.FC<PerformanceHeatmapProps> = ({
  player,
  seasonStats
}) => {
  const metrics = [
    'points',
    'assists',
    'rebounds',
    'steals',
    'blocks',
    'fieldGoalPercentage'
  ];

  const getPerformanceLevel = (value: number, metric: string): number => {
    const thresholds = {
      points: [10, 15, 20, 25, 30],
      assists: [2, 4, 6, 8, 10],
      rebounds: [3, 5, 7, 9, 11],
      steals: [0.5, 1, 1.5, 2, 2.5],
      blocks: [0.5, 1, 1.5, 2, 2.5],
      fieldGoalPercentage: [40, 45, 50, 55, 60]
    };

    const metricThresholds = thresholds[metric as keyof typeof thresholds];
    return metricThresholds.findIndex(threshold => value <= threshold) + 1;
  };

  const renderHeatmapCell = (value: number, metric: string) => {
    const level = getPerformanceLevel(value, metric);
    return (
      <div 
        className={`heatmap-cell level-${level}`}
        title={`${value.toFixed(1)} ${metric}`}
      >
        {value.toFixed(1)}
      </div>
    );
  };

  return (
    <div className="performance-heatmap">
      <h3>{player.fullName}'s Performance Heatmap</h3>
      <div className="heatmap-grid">
        <div className="heatmap-header">
          <div className="header-cell">Season</div>
          {metrics.map(metric => (
            <div key={metric} className="header-cell">
              {metric.charAt(0).toUpperCase() + metric.slice(1)}
            </div>
          ))}
        </div>
        {seasonStats.map((stats, index) => (
          <div key={index} className="heatmap-row">
            <div className="season-cell">{stats.season}</div>
            {metrics.map(metric => (
              <React.Fragment key={metric}>
                {renderHeatmapCell(stats[metric as keyof PlayerStats] as number, metric)}
              </React.Fragment>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PerformanceHeatmap; 