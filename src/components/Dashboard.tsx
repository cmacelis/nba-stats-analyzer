import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navigation from './shared/Navigation';
import { LoadingSpinner } from './LoadingSpinner';
import { useQuery } from '@tanstack/react-query';
import { nbaApi } from '../services/nbaApi';
import type { Player } from '../types/nba';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: recentPlayers, isLoading } = useQuery<Player[]>(
    ['recentPlayers'],
    () => nbaApi.getRecentPlayers(),
    { staleTime: 5 * 60 * 1000 } // 5 minutes
  );

  const handleCompareClick = () => {
    navigate('/compare');
  };

  const handlePlayerClick = (playerId: string) => {
    navigate(`/predictions/${playerId}`);
  };

  return (
    <div className="dashboard-page">
      <Navigation />
      <div className="dashboard-content">
        <header className="dashboard-header">
          <h1>Welcome back, {user?.displayName || 'User'}</h1>
        </header>

        <div className="features-grid">
          <div className="main-features">
            <div className="feature-card" onClick={handleCompareClick}>
              <h2>Player Comparison</h2>
              <p>Compare stats between any two NBA players</p>
            </div>

            <div className="feature-card" onClick={() => navigate('/historical')}>
              <h2>Historical Analysis</h2>
              <p>Deep dive into player career statistics</p>
            </div>

            <div className="feature-card" onClick={() => navigate('/news')}>
              <h2>NBA News</h2>
              <p>Latest updates and analysis</p>
            </div>
          </div>

          <div className="recent-activity">
            <h2>Recent Players</h2>
            {isLoading ? (
              <LoadingSpinner size="small" />
            ) : (
              <div className="recent-players">
                {recentPlayers?.map(player => (
                  <div 
                    key={player.id}
                    className="player-card"
                    onClick={() => handlePlayerClick(player.id)}
                  >
                    <h3>{player.fullName}</h3>
                    <p>{player.team}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 