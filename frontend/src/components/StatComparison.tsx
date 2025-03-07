import React from 'react';
import { Box, Paper, Typography, Grid } from '@mui/material';
import { Player, PlayerStats, ComparisonData } from '../types/player';
import { AnimatedElement } from './common/AnimatedElement';

interface StatComparisonProps {
  player1: Player;
  player2: Player;
  stats1: PlayerStats;
  stats2: PlayerStats;
  comparisonData?: ComparisonData;
  isLoading?: boolean;
}

export const StatComparison: React.FC<StatComparisonProps> = ({
  player1,
  player2,
  stats1,
  stats2,
  comparisonData,
  isLoading = false
}) => {
  return (
    <AnimatedElement animation="fadeIn">
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Statistical Comparison
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box>
              <Typography variant="subtitle1">{player1.name}</Typography>
              <Typography>
                PPG: {stats1.points.toFixed(1)}
              </Typography>
              <Typography>
                APG: {stats1.assists.toFixed(1)}
              </Typography>
              <Typography>
                RPG: {stats1.rebounds.toFixed(1)}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box>
              <Typography variant="subtitle1">{player2.name}</Typography>
              <Typography>
                PPG: {stats2.points.toFixed(1)}
              </Typography>
              <Typography>
                APG: {stats2.assists.toFixed(1)}
              </Typography>
              <Typography>
                RPG: {stats2.rebounds.toFixed(1)}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </AnimatedElement>
  );
}; 