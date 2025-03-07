import * as React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './AuthErrorBoundary.css';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class AuthErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Auth Error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  handleSignOut = async () => {
    try {
      const { signOut } = useAuth();
      await signOut();
      const navigate = useNavigate();
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="auth-error">
          <h2>Authentication Error</h2>
          <p>{this.state.error?.message || 'An error occurred during authentication'}</p>
          <div className="error-actions">
            <button onClick={this.handleRetry} className="retry-button">
              Try Again
            </button>
            <button onClick={this.handleSignOut} className="signout-button">
              Sign Out
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AuthErrorBoundary; 