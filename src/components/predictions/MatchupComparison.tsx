import React from 'react';
import { Player, PlayerStats } from '../../types/nba';
import { aiStatsService } from '../../services/aiStatsService';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import './MatchupComparison.css';

interface MatchupComparisonProps {
  player1Id: string;
  player2Id: string;
}

export const MatchupComparison: React.FC<MatchupComparisonProps> = ({
  player1Id,
  player2Id
}) => {
  const [comparison, setComparison] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchComparison = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await aiStatsService.compareMultiplePlayers([player1Id, player2Id]);
        setComparison(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch comparison');
      } finally {
        setLoading(false);
      }
    };

    if (player1Id && player2Id) {
      fetchComparison();
    }
  }, [player1Id, player2Id]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!comparison) {
    return <div>No comparison data available</div>;
  }

  return (
    <div className="matchup-comparison">
      <h3>Head-to-Head Comparison</h3>
      
      <div className="comparison-grid">
        <div className="player-column">
          <h4>Player 1</h4>
          {comparison[player1Id] && (
            <div className="stats-container">
              {Object.entries(comparison[player1Id].predictedStats).map(([key, value]) => (
                <div key={key} className="stat-row">
                  <span className="stat-label">{key}</span>
                  <span className="stat-value">{Number(value).toFixed(1)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="vs-column">
          <div className="vs-circle">VS</div>
        </div>

        <div className="player-column">
          <h4>Player 2</h4>
          {comparison[player2Id] && (
            <div className="stats-container">
              {Object.entries(comparison[player2Id].predictedStats).map(([key, value]) => (
                <div key={key} className="stat-row">
                  <span className="stat-label">{key}</span>
                  <span className="stat-value">{Number(value).toFixed(1)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 