import React from 'react';
import './TrendAnalysis.css';

interface TrendAnalysisProps {
  playerId: string;
  factors: { factor: string; impact: number }[];
}

const TrendAnalysis: React.FC<TrendAnalysisProps> = ({ playerId, factors }) => {
  return (
    <div className="trend-analysis">
      <h3>Trend Analysis</h3>
      <ul>
        {factors.map((factor, index) => (
          <li key={index}>
            <span className="factor">{factor.factor}</span>
            <span className={`impact ${factor.impact > 0 ? 'positive' : 'negative'}`}>
              {factor.impact > 0 ? '+' : ''}{factor.impact.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TrendAnalysis; 