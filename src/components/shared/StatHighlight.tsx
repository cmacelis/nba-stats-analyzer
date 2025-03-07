import * as React from 'react';
import { FaTrophy, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import './StatHighlight.css';

interface StatHighlightProps {
  value1: number;
  value2: number;
  label: string;
  higherIsBetter?: boolean;
  threshold?: number;
  formatter?: (value: number) => string;
}

const StatHighlight: React.FC<StatHighlightProps> = ({
  value1,
  value2,
  label,
  higherIsBetter = true,
  threshold = 0.1,
  formatter = (value: number) => value.toFixed(1)
}) => {
  const difference = value1 - value2;
  const percentDiff = Math.abs(difference / value2) * 100;
  const isSignificant = percentDiff >= threshold * 100;
  
  const better = higherIsBetter ? value1 > value2 : value1 < value2;
  const className = isSignificant 
    ? better ? 'highlight better' : 'highlight worse'
    : 'highlight equal';

  return (
    <div className={className}>
      <div className="highlight-header">
        <span className="highlight-label">{label}</span>
        {isSignificant && (
          <span className="highlight-icon">
            {better ? <FaTrophy /> : <FaArrowDown />}
          </span>
        )}
      </div>
      <div className="highlight-values">
        <span className="value">{formatter(value1)}</span>
        <span className="vs">vs</span>
        <span className="value">{formatter(value2)}</span>
      </div>
      {isSignificant && (
        <div className="highlight-diff">
          {better ? '+' : ''}{percentDiff.toFixed(1)}% {better ? 'better' : 'worse'}
        </div>
      )}
    </div>
  );
};

export default StatHighlight; 