import React from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import { ComparisonData, Player } from '../types/player';

interface LastMatchupProps {
  data: NonNullable<ComparisonData['lastMatchup']>;
  player1: Player;
  player2: Player;
}

export const LastMatchup: React.FC<LastMatchupProps> = ({
  data,
  player1,
  player2,
}) => {
  const winner = data.winner === 1 ? player1 : player2;
  const winnerPoints = data.winner === 1 ? data.player1Points : data.player2Points;
  const loserPoints = data.winner === 1 ? data.player2Points : data.player1Points;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Last Matchup
      </Typography>
      <Paper sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" align="center">
              {new Date(data.date).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3">
                {data.player1Points} - {data.player2Points}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                {winner.name} won by {Math.abs(winnerPoints - loserPoints)} points
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}; 