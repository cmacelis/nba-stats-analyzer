import * as React from 'react';
import { Player, PlayerStats } from '../../types/nba';
import { AdvancedStatsCalculator } from '../../utils/AdvancedStatsCalculator';
import './CareerMilestones.css';

interface CareerMilestonesProps {
  player: Player;
  seasonStats: PlayerStats[];
}

const CareerMilestones: React.FC<CareerMilestonesProps> = ({ player, seasonStats }) => {
  const milestones = React.useMemo(() => {
    const milestones = [];

    // Career high points
    const highestScoring = [...seasonStats].sort((a, b) => b.points - a.points)[0];
    if (highestScoring) {
      milestones.push({
        title: 'Career High PPG',
        description: `Averaged ${highestScoring.points.toFixed(1)} points per game`,
        season: highestScoring.season,
        value: highestScoring.points.toFixed(1),
        icon: '🏀'
      });
    }

    // Best PER season
    const bestPER = [...seasonStats].sort((a, b) => {
      const perA = AdvancedStatsCalculator.getAdvancedStats(a).per;
      const perB = AdvancedStatsCalculator.getAdvancedStats(b).per;
      return perB - perA;
    })[0];

    if (bestPER) {
      const perValue = AdvancedStatsCalculator.getAdvancedStats(bestPER).per;
      milestones.push({
        title: 'Peak Efficiency',
        description: `Career-best PER of ${perValue.toFixed(1)}`,
        season: bestPER.season,
        value: perValue.toFixed(1),
        icon: '📈'
      });
    }

    // Career totals
    const totalGames = seasonStats.reduce((sum, season) => sum + season.gamesPlayed, 0);
    milestones.push({
      title: 'Career Games',
      description: `Played ${totalGames} games over ${seasonStats.length} seasons`,
      season: 'Career',
      value: totalGames,
      icon: '⭐'
    });

    return milestones;
  }, [seasonStats]);

  return (
    <div className="career-milestones">
      <h3>Career Milestones</h3>
      <div className="milestones-grid">
        {milestones.map((milestone, index) => (
          <div key={index} className="milestone-card">
            <div className="milestone-icon">{milestone.icon}</div>
            <div className="milestone-content">
              <h4>{milestone.title}</h4>
              <p className="milestone-description">{milestone.description}</p>
              <div className="milestone-season">{milestone.season}</div>
            </div>
            <div className="milestone-value">{milestone.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CareerMilestones; 