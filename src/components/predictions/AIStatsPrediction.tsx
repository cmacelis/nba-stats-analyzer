import * as React from 'react';
import { Player } from '../../types/nba';
import { useQuery } from '@tanstack/react-query';
import { aiStatsService } from '../../services/aiStatsService';
import PlayerSearch from '../players/PlayerSearch';
import PredictionChart from './PredictionChart';
import TrendAnalysis from './TrendAnalysis';
import { LoadingSpinner } from '../LoadingSpinner';
import ErrorMessage from '../shared/ErrorMessage';
import './AIStatsPrediction.css';

const AIStatsPrediction: React.FC = () => {
  const [selectedPlayer, setSelectedPlayer] = React.useState<Player | null>(null);

  const { data: prediction, isLoading, error } = useQuery(
    ['prediction', selectedPlayer?.id],
    () => aiStatsService.getPrediction(selectedPlayer!.id),
    {
      enabled: !!selectedPlayer,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  return (
    <div className="ai-prediction">
      <h2>AI Stats Prediction</h2>
      <p className="description">
        Select a player to see AI-powered predictions for their upcoming performance
      </p>

      <PlayerSearch onPlayerSelect={setSelectedPlayer} />

      {isLoading && <LoadingSpinner text="Analyzing player data..." />}
      
      {error && <ErrorMessage message="Failed to generate prediction" />}

      {prediction && (
        <div className="prediction-content">
          <div className="prediction-header">
            <h3>{selectedPlayer?.fullName}</h3>
            <div className="confidence-score">
              Confidence: {prediction.confidence}%
            </div>
          </div>

          <PredictionChart
            historicalData={prediction.historicalStats}
            predictedData={prediction.predictedStats}
          />

          <TrendAnalysis
            factors={prediction.impactFactors}
            trend={prediction.trend}
          />

          <div className="prediction-stats">
            <h4>Predicted Stats</h4>
            <div className="stats-grid">
              {Object.entries(prediction.predictedStats).map(([key, value]) => (
                <div key={key} className="stat-item">
                  <span className="stat-label">{key}</span>
                  <span className="stat-value">{value.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIStatsPrediction; 