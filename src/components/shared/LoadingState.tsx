import * as React from 'react';
import { LoadingSpinner } from '../LoadingSpinner';
import './LoadingState.css';

interface LoadingStateProps {
  message?: string;
  overlay?: boolean;
}

const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = 'Loading...', 
  overlay = false 
}) => {
  return (
    <div className={`loading-state ${overlay ? 'overlay' : ''}`}>
      <LoadingSpinner />
      <p className="loading-message">{message}</p>
    </div>
  );
};

export default LoadingState; 