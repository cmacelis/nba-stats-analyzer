import * as React from 'react';
import { Player, PlayerStats } from '../../types/nba';
import { AdvancedStatsCalculator } from '../../utils/AdvancedStatsCalculator';
import './ComparisonInsights.css';

interface ComparisonInsightsProps {
  player1: Player;
  player2: Player;
  seasonStats1: PlayerStats[];
  seasonStats2: PlayerStats[];
}

interface Insight {
  category: string;
  title: string;
  description: string;
  advantage: 'player1' | 'player2' | 'neutral';
  difference: number;
}

const ComparisonInsights: React.FC<ComparisonInsightsProps> = ({
  player1,
  player2,
  seasonStats1,
  seasonStats2
}) => {
  const insights = React.useMemo(() => {
    return generateInsights(seasonStats1, seasonStats2);
  }, [seasonStats1, seasonStats2]);

  return (
    <div className="comparison-insights">
      <h3>Key Differences</h3>
      <div className="insights-grid">
        {insights.map((insight, index) => (
          <div key={index} className={`insight-card ${insight.advantage}`}>
            <div className="insight-header">
              <span className="category">{insight.category}</span>
              <h4>{insight.title}</h4>
            </div>
            <div className="insight-content">
              <div className="player-comparison">
                <div className={`player ${insight.advantage === 'player1' ? 'winner' : ''}`}>
                  {player1.fullName}
                </div>
                <div className="vs">vs</div>
                <div className={`player ${insight.advantage === 'player2' ? 'winner' : ''}`}>
                  {player2.fullName}
                </div>
              </div>
              <div className="difference">
                {insight.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const generateInsights = (stats1: PlayerStats[], stats2: PlayerStats[]): Insight[] => {
  const insights: Insight[] = [];
  
  if (!stats1[0] || !stats2[0]) return insights;

  const current1 = stats1[0];
  const current2 = stats2[0];
  const advanced1 = AdvancedStatsCalculator.getAdvancedStats(current1);
  const advanced2 = AdvancedStatsCalculator.getAdvancedStats(current2);

  // Add insights
  const addInsight = (
    category: string,
    title: string,
    value1: number,
    value2: number,
    format: (n: number) => string = n => n.toFixed(1)
  ) => {
    const diff = value1 - value2;
    insights.push({
      category,
      title,
      description: `${format(Math.abs(diff))} ${diff > 0 ? 'higher' : 'lower'}`,
      advantage: diff > 0 ? 'player1' : diff < 0 ? 'player2' : 'neutral',
      difference: Math.abs(diff)
    });
  };

  addInsight('Scoring', 'Points Per Game', current1.points, current2.points);
  addInsight('Efficiency', 'Player Efficiency Rating', advanced1.per, advanced2.per);
  addInsight('Impact', 'Win Shares', advanced1.winShares, advanced2.winShares);

  return insights.sort((a, b) => b.difference - a.difference);
};

export default ComparisonInsights; 