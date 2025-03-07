import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { checkAuthPersistence } from '../../utils/authPersistence';
import { LoadingSpinner } from '../LoadingSpinner';

const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

export const AuthStateListener: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const checkInterval = React.useRef<NodeJS.Timeout>();

  const verifyAuth = React.useCallback(async () => {
    try {
      const isValid = await checkAuthPersistence();
      if (!isValid && location.pathname !== '/login') {
        navigate('/login', { replace: true });
      }
    } catch (error) {
      console.error('Auth verification failed:', error);
    }
  }, [navigate, location.pathname]);

  React.useEffect(() => {
    let mounted = true;

    if (!loading && currentUser && mounted) {
      verifyAuth();
    }

    checkInterval.current = setInterval(() => {
      if (mounted && currentUser) {
        verifyAuth();
      }
    }, CHECK_INTERVAL);

    return () => {
      mounted = false;
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
    };
  }, [verifyAuth, loading, currentUser]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return <>{children}</>;
}; 