import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FaHome, FaChartBar, FaUser, FaNewspaper, FaSignOutAlt } from 'react-icons/fa';
import { ThemeToggle } from './ThemeToggle';
import './Navigation.css';

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="nav-wrapper">
      <nav className="nav-header">
        <div className="nav-brand" onClick={() => navigate('/')}>
          <img src="/logo.svg" alt="CourtVision" className="nav-logo" />
          <span className="nav-title">CourtVision</span>
        </div>

        <div className="nav-links">
          <button
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
            onClick={() => navigate('/')}
          >
            <FaHome />
            <span>Home</span>
          </button>

          <button
            className={`nav-link ${isActive('/compare') ? 'active' : ''}`}
            onClick={() => navigate('/compare')}
          >
            <FaChartBar />
            <span>Compare</span>
          </button>

          <button
            className={`nav-link ${isActive('/news') ? 'active' : ''}`}
            onClick={() => navigate('/news')}
          >
            <FaNewspaper />
            <span>News</span>
          </button>

          <button
            className={`nav-link ${isActive('/profile') ? 'active' : ''}`}
            onClick={() => navigate('/profile')}
          >
            <FaUser />
            <span>Profile</span>
          </button>
        </div>

        <div className="nav-actions">
          <ThemeToggle />
          <button className="signout-button" onClick={handleSignOut}>
            <FaSignOutAlt />
            <span>Sign Out</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Navigation; 