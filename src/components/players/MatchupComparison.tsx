import React from 'react';
import { Box, Typography, Paper, Alert } from '@mui/material';
import { StatTooltip } from '../StatTooltip';
import { StatComparison } from '../StatComparison';
import { usePlayerStats } from '../../hooks/usePlayerStats';
import { usePlayerComparison } from '../../hooks/usePlayerComparison';
import { Player } from '../../types/player';
import { ComparisonSkeleton } from '../common/ComparisonSkeleton';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface MatchupComparisonProps {
  player1: Player;
  player2: Player;
}

export const MatchupComparison: React.FC<MatchupComparisonProps> = ({
  player1,
  player2
}) => {
  const { stats1, stats2, isLoading: statsLoading, error: statsError } = usePlayerStats(player1, player2);
  const { data: comparisonData, isLoading: comparisonLoading, error: comparisonError } = usePlayerComparison(player1.id, player2.id);

  const isLoading = statsLoading || comparisonLoading;
  const error = statsError || comparisonError;

  if (isLoading) {
    return <ComparisonSkeleton />;
  }

  if (error) {
    return (
      <Alert severity="error">
        Error loading comparison data. Please try again.
      </Alert>
    );
  }

  return (
    <ErrorBoundary>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          {player1.name} vs {player2.name}
        </Typography>
        {stats1 && stats2 && comparisonData && (
          <StatComparison
            player1={player1}
            player2={player2}
            stats1={stats1}
            stats2={stats2}
            comparisonData={comparisonData}
          />
        )}
      </Paper>
    </ErrorBoundary>
  );
}; 