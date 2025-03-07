import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { aiStatsService } from '../../services/aiStatsService';
import { useToast } from '../../contexts/ToastContext';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { PredictionChart } from './PredictionChart';
import { TrendAnalysis } from './TrendAnalysis';
import { MatchupComparison } from './MatchupComparison';
import type { PredictionResult } from '../../services/aiStatsService';
import './AIStatsView.css';

interface AIStatsViewProps {
  playerId: string;
}

export const AIStatsView: React.FC<AIStatsViewProps> = ({ playerId }) => {
  const { showToast } = useToast();

  const { data: prediction, isLoading } = useQuery<PredictionResult>({
    queryKey: ['prediction', playerId],
    queryFn: () => aiStatsService.getPrediction(playerId),
    enabled: !!playerId,
    onError: (err) => {
      showToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to fetch prediction'
      });
    }
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!prediction) {
    return <div>No prediction data available</div>;
  }

  return (
    <div className="ai-stats-view">
      <div className="stats-header">
        <h2>AI Stats Analysis</h2>
      </div>

      <div className="stats-content">
        <PredictionChart prediction={prediction} />
        <TrendAnalysis playerId={playerId} />
        <MatchupComparison 
          player1Id={playerId} 
          player2Id={prediction.similarPlayers?.[0]?.id} 
        />
      </div>
    </div>
  );
};

export default AIStatsView; 