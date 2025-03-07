import * as React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './SessionManager.css';

export const SessionManager: React.FC = () => {
  const { 
    sessionTimeRemaining, 
    refreshSession, 
    isSessionExpiring,
    signOut 
  } = useAuth();

  const [showWarning, setShowWarning] = React.useState(false);

  React.useEffect(() => {
    if (isSessionExpiring && sessionTimeRemaining > 0) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
  }, [isSessionExpiring, sessionTimeRemaining]);

  const handleRefresh = async () => {
    try {
      await refreshSession();
      setShowWarning(false);
    } catch (error) {
      console.error('Failed to refresh session:', error);
    }
  };

  if (!showWarning) {
    return null;
  }

  return (
    <div className="session-warning">
      <div className="session-warning-content">
        <h3>Session Expiring</h3>
        <p>Your session will expire in {Math.ceil(sessionTimeRemaining / 60000)} minutes.</p>
        <div className="session-actions">
          <button onClick={handleRefresh} className="refresh-button">
            Extend Session
          </button>
          <button onClick={signOut} className="signout-button">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}; 