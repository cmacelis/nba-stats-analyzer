import React, { useState } from 'react';
import { Box, Typography, Grid, Paper, CircularProgress, Alert } from '@mui/material';
import PlayerSearch from '../components/PlayerSearch';
import { usePlayerComparison } from '../hooks/useNbaData';
import { Player } from '../types/player';

const PlayerComparison: React.FC = () => {
  const [player1, setPlayer1] = useState<Player | null>(null);
  const [player2, setPlayer2] = useState<Player | null>(null);

  // The hook calls your backend /api/players/compare/:id1/:id2
  const { data, isLoading, error } = usePlayerComparison(
    player1?.id?.toString() || '',
    player2?.id?.toString() || ''
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Player Comparison</Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <PlayerSearch 
            label="Select First Player"
            value={player1} 
            onChange={(p) => setPlayer1(p)} 
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <PlayerSearch 
            label="Select Second Player"
            value={player2} 
            onChange={(p) => setPlayer2(p)} 
          />
        </Grid>
      </Grid>

      {/* Loading State */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && <Alert severity="error">Error loading comparison data.</Alert>}

      {/* Comparison Results */}
      {player1 && player2 && data && data.player1 && data.player2 && (
        <Paper sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={4}><Typography fontWeight="bold">Metric</Typography></Grid>
            <Grid item xs={4}><Typography fontWeight="bold">{player1.name}</Typography></Grid>
            <Grid item xs={4}><Typography fontWeight="bold">{player2.name}</Typography></Grid>

            <Grid item xs={12}><hr /></Grid>

            <Grid item xs={4}>Points</Grid>
            <Grid item xs={4}>{data.player1.pts ?? 0}</Grid>
            <Grid item xs={4}>{data.player2.pts ?? 0}</Grid>

            <Grid item xs={4}>Rebounds</Grid>
            <Grid item xs={4}>{data.player1.reb ?? 0}</Grid>
            <Grid item xs={4}>{data.player2.reb ?? 0}</Grid>

            <Grid item xs={4}>Assists</Grid>
            <Grid item xs={4}>{data.player1.ast ?? 0}</Grid>
            <Grid item xs={4}>{data.player2.ast ?? 0}</Grid>
          </Grid>
        </Paper>
      )}

      {player1 && player2 && data && (!data.player1 || !data.player2) && (
        <Alert severity="warning">No stats available for the 2024 season for one or both players.</Alert>
      )}

      {!player1 || !player2 ? (
        <Alert severity="info">Please select two players to compare</Alert>
      ) : null}
    </Box>
  );
};

export default PlayerComparison;