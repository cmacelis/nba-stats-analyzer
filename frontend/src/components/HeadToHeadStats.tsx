import React from 'react';
import { Box, Typography, Grid, Paper } from '@mui/material';
import { ComparisonData } from '../types/player';
import { formatStatPercentage } from '../utils/formatUtils';

interface HeadToHeadStatsProps {
  data: ComparisonData;
  player1Name: string;
  player2Name: string;
}

export const HeadToHeadStats: React.FC<HeadToHeadStatsProps> = ({
  data,
  player1Name,
  player2Name,
}) => {
  if (!data?.matchups) return null;

  const player1WinPercentage = (data.player1Wins / data.matchups) * 100;
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Head to Head History
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3" color="primary.main">
              {data.player1Wins}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {player1Name}'s Wins
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3">
              {data.matchups}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Matchups
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3" color="secondary.main">
              {data.player2Wins}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {player2Name}'s Wins
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Win Rate
        </Typography>
        <Typography>
          {player1Name}: {formatStatPercentage(player1WinPercentage)}
        </Typography>
        <Typography>
          {player2Name}: {formatStatPercentage(100 - player1WinPercentage)}
        </Typography>
      </Box>
    </Box>
  );
}; 