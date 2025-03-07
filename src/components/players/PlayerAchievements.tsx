import * as React from 'react';
import { Player, PlayerStats } from '../../types/nba';
import { AdvancedStatsCalculator } from '../../utils/AdvancedStatsCalculator';
import './PlayerAchievements.css';

interface PlayerAchievementsProps {
  player: Player;
  seasonStats: PlayerStats[];
}

interface Achievement {
  category: string;
  title: string;
  value: string | number;
  rank?: number;
  percentile?: number;
}

const PlayerAchievements: React.FC<PlayerAchievementsProps> = ({ player, seasonStats }) => {
  const achievements = React.useMemo(() => {
    const achievements: Achievement[] = [];
    const currentSeason = seasonStats[0];
    
    if (!currentSeason) return achievements;

    // Scoring achievements
    if (currentSeason.points >= 25) {
      achievements.push({
        category: 'Scoring',
        title: 'Elite Scorer',
        value: `${currentSeason.points.toFixed(1)} PPG`,
        percentile: 95
      });
    }

    // Efficiency achievements
    const currentAdvanced = AdvancedStatsCalculator.getAdvancedStats(currentSeason);
    if (currentAdvanced.per >= 20) {
      achievements.push({
        category: 'Efficiency',
        title: 'High Efficiency',
        value: currentAdvanced.per.toFixed(1),
        percentile: 90
      });
    }

    // All-around achievements
    if (currentSeason.points >= 20 && 
        currentSeason.assists >= 5 && 
        currentSeason.rebounds >= 5) {
      achievements.push({
        category: 'Versatility',
        title: 'All-Around Player',
        value: '20/5/5 Club',
        percentile: 85
      });
    }

    // Career achievements
    const careerGames = seasonStats.reduce((sum, season) => sum + season.gamesPlayed, 0);
    if (careerGames >= 500) {
      achievements.push({
        category: 'Longevity',
        title: 'Career Games',
        value: careerGames,
        rank: Math.floor(careerGames / 100)
      });
    }

    return achievements;
  }, [seasonStats]);

  return (
    <div className="player-achievements">
      <h3>Player Achievements</h3>
      <div className="achievements-grid">
        {achievements.map((achievement, index) => (
          <div key={index} className="achievement-card">
            <div className="achievement-category">{achievement.category}</div>
            <h4>{achievement.title}</h4>
            <div className="achievement-value">{achievement.value}</div>
            {achievement.percentile && (
              <div className="achievement-percentile">
                Top {achievement.percentile}th Percentile
              </div>
            )}
            {achievement.rank && (
              <div className="achievement-rank">
                Rank: #{achievement.rank}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerAchievements; 