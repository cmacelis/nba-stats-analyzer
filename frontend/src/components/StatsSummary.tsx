import React from 'react';
import {
  Paper,
  Typography,
  Grid,
  Box,
  Tooltip,
  Chip,
  useTheme,
  Skeleton,
  Alert
} from '@mui/material';
import { 
  TrendingUp, 
  TrendingDown, 
  Remove,
  Info
} from '@mui/icons-material';
import { Player, PlayerStats } from '../types/player';
import { TransitionComponent } from './common/TransitionComponent';

interface StatsSummaryProps {
  player1: Player;
  player2: Player;
  stats1?: PlayerStats;
  stats2?: PlayerStats;
  isLoading?: boolean;
  error?: Error | null;
}

interface StatComparison {
  label: string;
  stat: keyof PlayerStats;
  description: string;
  format: (value: number) => string;
  threshold: number;
}

const keyStats: StatComparison[] = [
  {
    label: 'Points',
    stat: 'points',
    description: 'Average points scored per game',
    format: (value) => value.toFixed(1),
    threshold: 2
  },
  {
    label: 'Efficiency',
    stat: 'playerEfficiencyRating',
    description: 'Player Efficiency Rating - measures per-minute productivity',
    format: (value) => value.toFixed(1),
    threshold: 3
  },
  {
    label: 'FG%',
    stat: 'fieldGoalPercentage',
    description: 'Field Goal Percentage - shooting efficiency',
    format: (value) => `${value.toFixed(1)}%`,
    threshold: 3
  }
];

export const StatsSummary: React.FC<StatsSummaryProps> = ({
  player1,
  player2,
  stats1,
  stats2,
  isLoading = false,
  error = null
}) => {
  const theme = useTheme();

  const getComparisonIcon = (threshold: number, value1?: number, value2?: number) => {
    if (!value1 || !value2) return <Remove />;
    const diff = value1 - value2;
    if (Math.abs(diff) < threshold) return <Remove />;
    return diff > 0 ? <TrendingUp color="success" /> : <TrendingDown color="error" />;
  };

  const getComparisonColor = (value1?: number, value2?: number) => {
    if (!value1 || !value2) return 'default';
    return value1 > value2 ? 'success' : value1 < value2 ? 'error' : 'default';
  };

  if (isLoading) {
    return (
      <TransitionComponent>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Key Stats Comparison
            </Typography>
          </Box>
          <Grid container spacing={3}>
            {keyStats.map((_, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Box sx={{ 
                  textAlign: 'center',
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1
                }}>
                  <Skeleton variant="text" width={120} sx={{ mx: 'auto' }} />
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, my: 2 }}>
                    <Skeleton variant="rectangular" width={60} height={32} />
                    <Skeleton variant="circular" width={24} height={24} />
                    <Skeleton variant="rectangular" width={60} height={32} />
                  </Box>
                  <Skeleton variant="text" width={150} sx={{ mx: 'auto' }} />
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </TransitionComponent>
    );
  }

  if (error) {
    return (
      <TransitionComponent>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Alert severity="error">
            Error loading stats comparison
          </Alert>
        </Paper>
      </TransitionComponent>
    );
  }

  return (
    <TransitionComponent>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Key Stats Comparison
          </Typography>
          <Tooltip title="Compare key performance metrics">
            <Info sx={{ ml: 1, color: 'text.secondary' }} />
          </Tooltip>
        </Box>

        <Grid container spacing={3}>
          {keyStats.map(({ label, stat, description, format, threshold }) => (
            <Grid item xs={12} md={4} key={stat}>
              <Box sx={{ 
                textAlign: 'center',
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1
              }}>
                <Typography variant="subtitle2" gutterBottom>
                  {label}
                  <Tooltip title={description}>
                    <Info 
                      sx={{ 
                        ml: 0.5, 
                        fontSize: 16, 
                        color: 'text.secondary',
                        verticalAlign: 'middle'
                      }} 
                    />
                  </Tooltip>
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 1 }}>
                  <Chip
                    label={stats1 ? format(stats1[stat]) : '-'}
                    color={getComparisonColor(stats1?.[stat], stats2?.[stat])}
                    variant="outlined"
                  />
                  {getComparisonIcon(threshold, stats1?.[stat], stats2?.[stat])}
                  <Chip
                    label={stats2 ? format(stats2[stat]) : '-'}
                    color={getComparisonColor(stats2?.[stat], stats1?.[stat])}
                    variant="outlined"
                  />
                </Box>

                <Typography variant="caption" color="text.secondary">
                  {player1.name} vs {player2.name}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </TransitionComponent>
  );
}; 