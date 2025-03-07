import * as React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { aiStatsService } from '../../services/aiStatsService';
import { LoadingSpinner } from '../LoadingSpinner';
import ErrorMessage from '../shared/ErrorMessage';
import PredictionChart from './PredictionChart';
import TrendAnalysis from './TrendAnalysis';
import { MatchupComparison } from '../players/MatchupComparison';
import { PredictionResult } from '../../types/prediction';
import './AIPredictionView.css';

const AIPredictionView: React.FC = () => {
  const { playerId } = useParams<{ playerId: string }>();

  const { data: prediction, isLoading, error } = useQuery<PredictionResult>(
    ['prediction', playerId],
    () => aiStatsService.getPrediction(playerId!),
    {
      enabled: !!playerId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  if (isLoading) {
    return <LoadingSpinner size="large" text="Analyzing player data..." />;
  }

  if (error) {
    return (
      <ErrorMessage 
        message="Failed to load prediction data" 
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (!prediction) {
    return null;
  }

  return (
    <div className="prediction-view">
      <h2>AI Performance Prediction</h2>
      
      <div className="prediction-content">
        <div className="prediction-header">
          <h3>{prediction.player.fullName}</h3>
          <div className="confidence-score">
            Confidence Score: {(prediction.confidenceScore * 100).toFixed(1)}%
          </div>
        </div>

        <PredictionChart 
          historicalData={prediction.historicalStats}
          predictedData={prediction.predictedStats}
        />

        <div className="prediction-details">
          <div className="prediction-stats">
            {Object.entries(prediction.predictedStats).map(([stat, value]) => (
              <div key={stat} className="stat-card">
                <h4>{stat}</h4>
                <div className="stat-value">{value.toFixed(1)}</div>
                <div className={`trend ${prediction.trends[stat].direction}`}>
                  {prediction.trends[stat].percentage}%
                </div>
              </div>
            ))}
          </div>

          <TrendAnalysis 
            playerId={playerId!}
            factors={prediction.impactFactors}
          />

          <MatchupComparison 
            player1Id={playerId!} 
            player2Id={prediction.similarPlayers?.[0]?.id}
          />
        </div>
      </div>
    </div>
  );
};

export default AIPredictionView; 