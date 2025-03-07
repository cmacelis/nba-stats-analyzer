import * as React from 'react';
import { Player, PlayerStats } from '../../types/nba';
import { nbaApi } from '../../services/nbaApi';
import PlayerSearch from './PlayerSearch';
import CareerMilestones from './CareerMilestones';
import PerformanceHeatmap from './PerformanceHeatmap';
import HistoricalTrends from './HistoricalTrends';
import { LoadingSpinner } from '../LoadingSpinner';
import './HistoricalDataViewer.css';

interface HistoricalDataViewerProps {
  // Remove preview?: boolean;
}

const HistoricalDataViewer: React.FC = () => {
  const [selectedPlayer, setSelectedPlayer] = React.useState<Player | null>(null);
  const [seasonStats, setSeasonStats] = React.useState<PlayerStats[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handlePlayerSelect = async (player: Player) => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch historical stats for the last 10 seasons
      const currentYear = new Date().getFullYear();
      const historicalStats = await Promise.all(
        Array.from({ length: 10 }, (_, i) => {
          const year = currentYear - i;
          return nbaApi.getPlayerStats(player.id, `${year}-${(year + 1).toString().slice(-2)}`);
        })
      );

      setSelectedPlayer(player);
      setSeasonStats(historicalStats as PlayerStats[]);
    } catch (err) {
      setError('Failed to fetch player stats');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="historical-data-viewer">
      <h2>Historical Player Data</h2>
      
      <div className="search-section">
        <PlayerSearch 
          onPlayerSelect={handlePlayerSelect}
          selectedSeason={`${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`}
        />
      </div>

      {loading && (
        <div className="loading-container">
          <LoadingSpinner />
          <p>Loading player history...</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {selectedPlayer && seasonStats.length > 0 && (
        <div className="historical-data">
          <CareerMilestones 
            player={selectedPlayer}
            seasonStats={seasonStats}
          />

          <PerformanceHeatmap
            player={selectedPlayer}
            seasonStats={seasonStats}
          />

          <HistoricalTrends
            player={selectedPlayer}
            seasonStats={seasonStats}
          />

          <div className="career-summary">
            <h3>Career Overview</h3>
            <div className="summary-stats">
              <div className="stat-item">
                <span className="label">Seasons Played</span>
                <span className="value">{seasonStats.length}</span>
              </div>
              <div className="stat-item">
                <span className="label">Career PPG</span>
                <span className="value">
                  {(seasonStats.reduce((sum, stat) => sum + stat.points, 0) / seasonStats.length).toFixed(1)}
                </span>
              </div>
              <div className="stat-item">
                <span className="label">Games Played</span>
                <span className="value">
                  {seasonStats.reduce((sum, stat) => sum + stat.gamesPlayed, 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoricalDataViewer; 