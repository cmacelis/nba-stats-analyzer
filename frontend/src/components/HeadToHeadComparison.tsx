import React from 'react';
import {
  Paper,
  Typography,
  Grid,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { Player, Matchup } from '../types/player';
import { formatDate } from '../utils/formatUtils';

interface HeadToHeadComparisonProps {
  player1: Player;
  player2: Player;
  matchups: Matchup[];
}

const HeadToHeadComparison: React.FC<HeadToHeadComparisonProps> = ({
  player1,
  player2,
  matchups
}) => {
  if (!matchups?.length) return null;

  // Calculate head-to-head stats
  const totalGames = matchups.length;
  const player1Wins = matchups.filter(m => 
    (m.player1Score > m.player2Score)
  ).length;
  const player2Wins = matchups.filter(m => 
    (m.player2Score > m.player1Score)
  ).length;
  
  const player1WinPercentage = totalGames > 0 ? (player1Wins / totalGames) * 100 : 0;
  const player2WinPercentage = totalGames > 0 ? (player2Wins / totalGames) * 100 : 0;
  
  const player1AvgPoints = matchups.length > 0 
    ? matchups.reduce((sum, m) => sum + m.player1Score, 0) / matchups.length 
    : 0;
  
  const player2AvgPoints = matchups.length > 0 
    ? matchups.reduce((sum, m) => sum + m.player2Score, 0) / matchups.length 
    : 0;

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Head-to-Head Matchups
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="subtitle2" color="text.secondary">
                Total Games
              </Typography>
              <Typography variant="h5">
                {totalGames}
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="subtitle2" color="text.secondary">
                Win Percentage
              </Typography>
              <Typography variant="body1">
                {player1.name}: {player1WinPercentage.toFixed(1)}%
              </Typography>
              <Typography variant="body1">
                {player2.name}: {player2WinPercentage.toFixed(1)}%
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="subtitle2" color="text.secondary">
                Average Points
              </Typography>
              <Typography variant="body1">
                {player1.name}: {player1AvgPoints.toFixed(1)}
              </Typography>
              <Typography variant="body1">
                {player2.name}: {player2AvgPoints.toFixed(1)}
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="subtitle2" color="text.secondary">
                Last Matchup
              </Typography>
              <Typography variant="body1">
                {matchups.length > 0 ? formatDate(matchups[0].date) : 'N/A'}
              </Typography>
            </Grid>
          </Grid>
          
          <Divider sx={{ mb: 3 }} />
          
          <Typography variant="subtitle1" gutterBottom>
            Recent Matchups
          </Typography>
          
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">{player1.name}</TableCell>
                  <TableCell align="right">{player2.name}</TableCell>
                  <TableCell>Result</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {matchups.slice(0, 5).map((matchup, index) => (
                  <TableRow key={index}>
                    <TableCell>{formatDate(matchup.date)}</TableCell>
                    <TableCell>
                      {matchup.type === 'playoffs' ? 'Playoffs' : 'Regular Season'}
                    </TableCell>
                    <TableCell align="right">{matchup.player1Score}</TableCell>
                    <TableCell align="right">{matchup.player2Score}</TableCell>
                    <TableCell>{matchup.result}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
    </Paper>
  );
};

export default HeadToHeadComparison; 