import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../config/firebase';
import { LoadingSpinner } from './LoadingSpinner';
import { FaChartBar, FaUsers, FaBasketballBall, FaHistory, FaStar } from 'react-icons/fa';
import './Dashboard.css';

interface RecentComparison {
  id: string;
  player1: string;
  player2: string;
  date: Date;
}

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentComparisons, setRecentComparisons] = useState<RecentComparison[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setInitialLoading(true);
        // Mock data for testing
        setRecentComparisons([
          {
            id: '1',
            player1: 'LeBron James',
            player2: 'Kevin Durant',
            date: new Date()
          },
          {
            id: '2',
            player1: 'Stephen Curry',
            player2: 'Damian Lillard',
            date: new Date()
          }
        ]);
        
        setFavorites(['LeBron James', 'Stephen Curry', 'Luka Doncic']);
      } catch (error) {
        console.error('Error loading dashboard:', error);
        setError('Failed to load dashboard data');
      } finally {
        setInitialLoading(false);
      }
    };

    loadDashboardData();
  }, [currentUser]);

  const handleSignOut = async () => {
    try {
      setLoading(true);
      setError('');
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      setError('Failed to sign out');
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <LoadingSpinner overlay text="Loading dashboard..." />;
  }

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-brand">CourtVision</div>
        <div className="nav-user">
          <span>{currentUser?.email}</span>
          <button onClick={handleSignOut} className="sign-out-btn">
            Sign Out
          </button>
        </div>
      </nav>

      <div className="dashboard-content">
        <header className="welcome-section">
          <h1>Welcome to CourtVision</h1>
          <p>Your NBA Statistics Analysis Platform</p>
        </header>

        {error && <div className="error-alert">{error}</div>}

        <div className="quick-stats">
          <div className="stat-card">
            <h3>Comparisons Made</h3>
            <p className="stat-number">{recentComparisons.length}</p>
          </div>
          <div className="stat-card">
            <h3>Favorite Players</h3>
            <p className="stat-number">{favorites.length}</p>
          </div>
        </div>

        <div className="features-grid">
          <div className="feature-card" onClick={() => navigate('/compare')}>
            <FaUsers className="feature-icon" />
            <h3>Player Comparisons</h3>
            <p>Compare stats between players</p>
          </div>

          <div className="feature-card" onClick={() => navigate('/teams')}>
            <FaBasketballBall className="feature-icon" />
            <h3>Team Analysis</h3>
            <p>View detailed team statistics</p>
          </div>

          <div className="feature-card" onClick={() => navigate('/predictions')}>
            <FaChartBar className="feature-icon" />
            <h3>Game Predictions</h3>
            <p>AI-powered game predictions</p>
          </div>

          <div className="feature-card" onClick={() => navigate('/history')}>
            <FaHistory className="feature-icon" />
            <h3>Historical Data</h3>
            <p>Access historical NBA statistics</p>
          </div>
        </div>

        <div className="dashboard-sections">
          <section className="recent-activity">
            <h2>Recent Comparisons</h2>
            <div className="activity-list">
              {recentComparisons.map(comparison => (
                <div key={comparison.id} className="activity-item">
                  <span>{comparison.player1} vs {comparison.player2}</span>
                  <span className="activity-date">
                    {comparison.date.toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="favorites">
            <h2>Favorite Players</h2>
            <div className="favorites-list">
              {favorites.map(player => (
                <div key={player} className="favorite-item">
                  <FaStar className="star-icon" />
                  <span>{player}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 