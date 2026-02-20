import React from 'react';
import {
  Paper,
  Typography, 
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  IconButton
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { Player, PlayerStats } from '../types/player';
import { calculateAdvancedStats } from '../utils/statsCalculator';

interface AdvancedStatsProps {
  player1: Player;
  player2: Player;
  player1Stats: PlayerStats;
  player2Stats: PlayerStats;
}

interface AdvancedStat {
  key: string;
  label: string;
  description: string;
  higherIsBetter: boolean;
}

const advancedStatDefinitions: AdvancedStat[] = [
  {
    key: 'per',
    label: 'PER',
    description: 'Player Efficiency Rating - A measure of per-minute production standardized such that the league average is 15',
    higherIsBetter: true
  },
  {
    key: 'ts',
    label: 'TS%',
    description: 'True Shooting Percentage - A measure of shooting efficiency that takes into account field goals, 3-point field goals, and free throws',
    higherIsBetter: true
  },
  {
    key: 'efg',
    label: 'eFG%',
    description: 'Effective Field Goal Percentage - A field goal percentage that adjusts for the fact that a 3-point field goal is worth more than a 2-point field goal',
    higherIsBetter: true
  },
  {
    key: 'usg',
    label: 'USG%',
    description: 'Usage Rate - An estimate of the percentage of team plays used by a player while they are on the floor',
    higherIsBetter: true
  },
  {
    key: 'ortg',
    label: 'ORtg',
    description: 'Offensive Rating - An estimate of points produced per 100 possessions',
    higherIsBetter: true
  },
  {
    key: 'drtg',
    label: 'DRtg',
    description: 'Defensive Rating - An estimate of points allowed per 100 possessions',
    higherIsBetter: false
  },
  {
    key: 'bpm',
    label: 'BPM',
    description: 'Box Plus/Minus - A box score estimate of the points per 100 possessions a player contributed above a league-average player',
    higherIsBetter: true
  },
  {
    key: 'ws48',
    label: 'WS/48',
    description: 'Win Shares Per 48 Minutes - An estimate of the number of wins contributed by a player per 48 minutes',
    higherIsBetter: true
  },
  {
    key: 'vorp',
    label: 'VORP',
    description: 'Value Over Replacement Player - A box score estimate of the points per 100 team possessions that a player contributed above a replacement-level player',
    higherIsBetter: true
  }
];

const AdvancedStats: React.FC<AdvancedStatsProps> = ({
  player1,
  player2,
  player1Stats,
  player2Stats
}) => {
  const player1Advanced = calculateAdvancedStats(player1Stats);
  const player2Advanced = calculateAdvancedStats(player2Stats);
  
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Advanced Statistics
      </Typography>
      
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Metric</TableCell>
              <TableCell align="right">{player1.name}</TableCell>
              <TableCell align="right">{player2.name}</TableCell>
              <TableCell align="right">Difference</TableCell>
              <TableCell>Info</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {advancedStatDefinitions.map((stat) => {
              const player1Value = player1Advanced[stat.key as keyof typeof player1Advanced] || 0;
              const player2Value = player2Advanced[stat.key as keyof typeof player2Advanced] || 0;
              const difference = player1Value - player2Value;
              const isPlayer1Better = stat.higherIsBetter ? difference > 0 : difference < 0;
              
              return (
                <TableRow key={stat.key}>
                  <TableCell component="th" scope="row">
                    {stat.label}
                  </TableCell>
                  <TableCell 
                    align="right"
                    sx={{ 
                      fontWeight: isPlayer1Better ? 'bold' : 'normal',
                      color: isPlayer1Better ? 'success.main' : 'text.primary'
                    }}
                  >
                    {player1Value.toFixed(1)}
                  </TableCell>
                  <TableCell 
                    align="right"
                    sx={{ 
                      fontWeight: !isPlayer1Better ? 'bold' : 'normal',
                      color: !isPlayer1Better ? 'success.main' : 'text.primary'
                    }}
                  >
                    {player2Value.toFixed(1)}
                  </TableCell>
                  <TableCell 
                    align="right"
                    sx={{ 
                      color: isPlayer1Better ? 'success.main' : 'error.main'
                    }}
                  >
                    {Math.abs(difference).toFixed(1)}
                  </TableCell>
                  <TableCell>
                    <Tooltip title={stat.description}>
                      <IconButton size="small">
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default AdvancedStats; 