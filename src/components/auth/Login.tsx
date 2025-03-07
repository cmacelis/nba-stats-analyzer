import * as React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { APIError } from '../../utils/errorHandler';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaGoogle, FaApple } from 'react-icons/fa';
import { LoadingSpinner } from '../LoadingSpinner';
import './Login.css';

const Login: React.FC = () => {
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    try {
      setLoading(true);
      setError(null);
      
      const signInMethod = provider === 'google' ? signInWithGoogle : signInWithApple;
      await signInMethod();
      
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof APIError ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Welcome to CourtVision</h1>
        <p className="subtitle">Sign in to access advanced NBA analytics</p>

        {error && <div className="error-message">{error}</div>}

        <div className="social-buttons">
          <button 
            className="social-button google"
            onClick={() => handleSocialLogin('google')}
            disabled={loading}
          >
            <FaGoogle /> Continue with Google
          </button>
          <button 
            className="social-button apple"
            onClick={() => handleSocialLogin('apple')}
            disabled={loading}
          >
            <FaApple /> Continue with Apple
          </button>
        </div>

        {loading && (
          <div className="loading-overlay">
            <LoadingSpinner />
            <p>Signing you in...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login; 
