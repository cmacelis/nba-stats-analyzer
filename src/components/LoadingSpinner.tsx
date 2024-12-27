import React from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  overlay?: boolean;
  text?: string;
  type?: 'spinner' | 'dots' | 'pulse';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium',
  overlay = false,
  text,
  type = 'spinner'
}) => (
  <div className={`loading-container ${overlay ? 'overlay' : ''}`}>
    <div className={`loading-animation ${type} ${size}`}>
      {type === 'spinner' && <div className="spinner-inner"></div>}
      {type === 'dots' && (
        <>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </>
      )}
      {type === 'pulse' && <div className="pulse"></div>}
    </div>
    {text && <div className="loading-text">{text}</div>}
  </div>
); 