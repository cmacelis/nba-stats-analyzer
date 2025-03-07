import * as React from 'react';
import { Player, PlayerStats } from '../../types/nba';
import { AdvancedStatsCalculator } from '../../utils/AdvancedStatsCalculator';
import './HeadToHeadComparison.css';

interface HeadToHeadComparisonProps {
  player1: Player;
  player2: Player;
  stats1: PlayerStats;
  stats2: PlayerStats;
}

const HeadToHeadComparison: React.FC<HeadToHeadComparisonProps> = ({
  player1,
  player2,
  stats1,
  stats2
}) => {
  const advanced1 = AdvancedStatsCalculator.calculateAll(stats1);
  const advanced2 = AdvancedStatsCalculator.calculateAll(stats2);

  const calculateDifference = (value1: number, value2: number) => {
    return ((value1 - value2) / value2 * 100).toFixed(1);
  };

  return (
    <div className="head-to-head">
      <h3>Head-to-Head Analysis</h3>
      <div className="comparison-grid">
        <div className="player-card">
          <h4>{player1.fullName}</h4>
          <div className="advanced-stats">
            <div className="stat-item">
              <span className="label">PER</span>
              <span className="value">{advanced1.per.toFixed(1)}</span>
            </div>
            <div className="stat-item">
              <span className="label">True Shooting %</span>
              <span className="value">{advanced1.trueShootingPercentage.toFixed(1)}%</span>
            </div>
            <div className="stat-item">
              <span className="label">Usage Rate</span>
              <span className="value">{advanced1.usagePercentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="comparison-summary">
          <div className="difference-indicator">
            {calculateDifference(advanced1.per, advanced2.per)}% PER difference
          </div>
        </div>

        <div className="player-card">
          <h4>{player2.fullName}</h4>
          <div className="advanced-stats">
            <div className="stat-item">
              <span className="label">PER</span>
              <span className="value">{advanced2.per.toFixed(1)}</span>
            </div>
            <div className="stat-item">
              <span className="label">True Shooting %</span>
              <span className="value">{advanced2.trueShootingPercentage.toFixed(1)}%</span>
            </div>
            <div className="stat-item">
              <span className="label">Usage Rate</span>
              <span className="value">{advanced2.usagePercentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeadToHeadComparison; 