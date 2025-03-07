import * as React from 'react';
import { Player, PlayerStats } from '../../types/nba';
import { AdvancedStatsCalculator } from '../../utils/AdvancedStatsCalculator';
import { Radar } from 'react-chartjs-2';
import './AdvancedStatsComparison.css';

interface AdvancedStatsComparisonProps {
  player1: Player;
  player2: Player;
  seasonStats1: PlayerStats[];
  seasonStats2: PlayerStats[];
}

const AdvancedStatsComparison: React.FC<AdvancedStatsComparisonProps> = ({
  player1,
  player2,
  seasonStats1,
  seasonStats2
}) => {
  const advancedStats1 = React.useMemo(() => 
    AdvancedStatsCalculator.getAdvancedStats(seasonStats1[0]), [seasonStats1]);
  const advancedStats2 = React.useMemo(() => 
    AdvancedStatsCalculator.getAdvancedStats(seasonStats2[0]), [seasonStats2]);

  const radarData = {
    labels: ['PER', 'True Shooting %', 'Win Shares', 'VORP', 'BPM'],
    datasets: [
      {
        label: player1.fullName,
        data: [
          advancedStats1.per,
          advancedStats1.trueShootingPercentage,
          advancedStats1.winShares,
          advancedStats1.vorp,
          advancedStats1.bpm
        ],
        backgroundColor: 'rgba(30, 60, 114, 0.2)',
        borderColor: 'rgba(30, 60, 114, 1)',
        borderWidth: 2
      },
      {
        label: player2.fullName,
        data: [
          advancedStats2.per,
          advancedStats2.trueShootingPercentage,
          advancedStats2.winShares,
          advancedStats2.vorp,
          advancedStats2.bpm
        ],
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 2
      }
    ]
  };

  return (
    <div className="advanced-stats-comparison">
      <h3>Advanced Stats Comparison</h3>
      
      <div className="stats-grid">
        <div className="stats-column">
          <h4>{player1.fullName}</h4>
          <div className="stat-item">
            <span className="label">PER</span>
            <span className="value">{advancedStats1.per.toFixed(1)}</span>
          </div>
          <div className="stat-item">
            <span className="label">True Shooting %</span>
            <span className="value">{advancedStats1.trueShootingPercentage.toFixed(1)}%</span>
          </div>
          <div className="stat-item">
            <span className="label">Win Shares</span>
            <span className="value">{advancedStats1.winShares.toFixed(1)}</span>
          </div>
        </div>

        <div className="stats-column">
          <h4>{player2.fullName}</h4>
          <div className="stat-item">
            <span className="label">PER</span>
            <span className="value">{advancedStats2.per.toFixed(1)}</span>
          </div>
          <div className="stat-item">
            <span className="label">True Shooting %</span>
            <span className="value">{advancedStats2.trueShootingPercentage.toFixed(1)}%</span>
          </div>
          <div className="stat-item">
            <span className="label">Win Shares</span>
            <span className="value">{advancedStats2.winShares.toFixed(1)}</span>
          </div>
        </div>
      </div>

      <div className="radar-chart">
        <Radar data={radarData} />
      </div>
    </div>
  );
};

export default AdvancedStatsComparison; 