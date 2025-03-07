import * as React from 'react';
import { FaArrowUp, FaArrowDown, FaEquals } from 'react-icons/fa';
import './TrendIndicator.css';

interface TrendIndicatorProps {
  current: number;
  previous: number;
  threshold?: number;
}

const TrendIndicator: React.FC<TrendIndicatorProps> = ({ 
  current, 
  previous, 
  threshold = 0.05 // 5% change threshold
}) => {
  const percentChange = ((current - previous) / previous) * 100;
  const isSignificant = Math.abs(percentChange) >= threshold * 100;

  if (!isSignificant) {
    return (
      <span className="trend-indicator stable" title="Stable">
        <FaEquals />
        <span className="trend-value">(±{percentChange.toFixed(1)}%)</span>
      </span>
    );
  }

  return percentChange > 0 ? (
    <span className="trend-indicator improving" title="Improving">
      <FaArrowUp />
      <span className="trend-value">(+{percentChange.toFixed(1)}%)</span>
    </span>
  ) : (
    <span className="trend-indicator declining" title="Declining">
      <FaArrowDown />
      <span className="trend-value">({percentChange.toFixed(1)}%)</span>
    </span>
  );
};

export default TrendIndicator; 