import * as React from 'react';
import './StatTooltip.css';

interface StatTooltipProps {
  label: string;
  description: string;
  children: React.ReactNode;
}

const StatTooltip: React.FC<StatTooltipProps> = ({ label, description, children }) => {
  return (
    <div className="stat-tooltip-container">
      {children}
      <div className="stat-tooltip">
        <h4>{label}</h4>
        <p>{description}</p>
      </div>
    </div>
  );
};

export default StatTooltip; 