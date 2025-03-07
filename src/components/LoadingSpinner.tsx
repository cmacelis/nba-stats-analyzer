import React from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  overlay?: boolean;
  text?: string;
  ariaLabel?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  overlay = false,
  text,
  ariaLabel = 'Loading'
}) => {
  return (
    <div 
      className={`loading-container ${size} ${overlay ? 'overlay' : ''}`}
      role="alert"
      aria-busy="true"
      aria-label={ariaLabel}
    >
      <div className="spinner-wrapper">
        <div className="spinner" />
      </div>
      {text && (
        <div className="loading-text" aria-live="polite">
          {text}
        </div>
      )}
    </div>
  );
}; 