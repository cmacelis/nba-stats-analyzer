import React, { Component, ErrorInfo, ReactNode } from 'react';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    retryCount: 0
  };

  public static defaultProps = {
    maxRetries: 3
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
    
    // Log to error reporting service
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    const { maxRetries = 3 } = this.props;
    const newRetryCount = this.state.retryCount + 1;

    if (newRetryCount <= maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        retryCount: newRetryCount
      });
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    const { hasError, error, retryCount } = this.state;
    const { maxRetries = 3 } = this.props;

    if (hasError) {
      if (retryCount >= maxRetries) {
        return (
          <div className="error-boundary error-boundary--fatal">
            <h2>Something went wrong</h2>
            <p>We've tried to recover but were unsuccessful.</p>
            <div className="error-actions">
              <button onClick={this.handleReload} className="reload-button">
                Reload Page
              </button>
              <a href="/" className="home-link">
                Return to Home
              </a>
            </div>
            <details className="error-details">
              <summary>Error Details</summary>
              <pre>{error?.toString()}</pre>
            </details>
          </div>
        );
      }

      return this.props.fallback || (
        <div className="error-boundary">
          <h2>Oops, something went wrong!</h2>
          <p>{error?.message}</p>
          <div className="error-actions">
            <button onClick={this.handleReset} className="reset-button">
              Try Again ({maxRetries - retryCount} attempts remaining)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 