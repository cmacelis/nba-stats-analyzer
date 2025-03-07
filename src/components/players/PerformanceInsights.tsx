import * as React from 'react';
import { Player, PlayerStats } from '../../types/nba';
import { AdvancedStatsCalculator } from '../../utils/AdvancedStatsCalculator';
import './PerformanceInsights.css';

interface PerformanceInsightsProps {
  player: Player;
  seasonStats: PlayerStats[];
}

interface Insight {
  type: 'positive' | 'negative' | 'neutral';
  title: string;
  description: string;
  value?: string | number;
}

const PerformanceInsights: React.FC<PerformanceInsightsProps> = ({ player, seasonStats }) => {
  const insights = React.useMemo(() => {
    if (seasonStats.length < 2) return [];

    const insights: Insight[] = [];
    const latestSeason = seasonStats[0];
    const previousSeason = seasonStats[1];

    // Scoring trend
    const scoringDiff = latestSeason.points - previousSeason.points;
    insights.push({
      type: scoringDiff > 0 ? 'positive' : scoringDiff < 0 ? 'negative' : 'neutral',
      title: 'Scoring Trend',
      description: `${Math.abs(scoringDiff).toFixed(1)} PPG ${scoringDiff > 0 ? 'increase' : 'decrease'} from last season`,
      value: `${scoringDiff > 0 ? '+' : ''}${scoringDiff.toFixed(1)}`
    });

    // Efficiency analysis
    const latestAdvanced = AdvancedStatsCalculator.getAdvancedStats(latestSeason);
    const previousAdvanced = AdvancedStatsCalculator.getAdvancedStats(previousSeason);
    const perDiff = latestAdvanced.per - previousAdvanced.per;
    insights.push({
      type: perDiff > 0 ? 'positive' : perDiff < 0 ? 'negative' : 'neutral',
      title: 'Efficiency Rating',
      description: `PER ${perDiff > 0 ? 'improved' : 'declined'} by ${Math.abs(perDiff).toFixed(1)}`,
      value: latestAdvanced.per.toFixed(1)
    });

    // Win contribution
    const winSharesDiff = latestAdvanced.winShares - previousAdvanced.winShares;
    insights.push({
      type: winSharesDiff > 0 ? 'positive' : winSharesDiff < 0 ? 'negative' : 'neutral',
      title: 'Win Contribution',
      description: `${Math.abs(winSharesDiff).toFixed(1)} win shares ${winSharesDiff > 0 ? 'increase' : 'decrease'}`,
      value: latestAdvanced.winShares.toFixed(1)
    });

    return insights;
  }, [seasonStats]);

  return (
    <div className="performance-insights">
      <h3>Performance Insights</h3>
      <div className="insights-grid">
        {insights.map((insight, index) => (
          <div key={index} className={`insight-card ${insight.type}`}>
            <div className="insight-header">
              <h4>{insight.title}</h4>
              {insight.value && <span className="insight-value">{insight.value}</span>}
            </div>
            <p>{insight.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PerformanceInsights; 