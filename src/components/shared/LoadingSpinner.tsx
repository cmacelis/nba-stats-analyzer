import React from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium',
  text
}) => (
  <div className={`loading-container ${size}`}>
    <div className="loading-spinner" />
    {text && <div className="loading-text">{text}</div>}
  </div>
); 