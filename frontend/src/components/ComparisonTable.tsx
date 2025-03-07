import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  Alert
} from '@mui/material';
import { Player, PlayerStats } from '../types/player';
import { StatsFormatter } from './StatsFormatter';
import { LoadingOverlay } from './common/LoadingOverlay';
import { statCategories } from '../config/statConfig';
import { TransitionComponent } from './common/TransitionComponent';

interface ComparisonTableProps {
  player1: Player;
  player2: Player;
  stats1?: PlayerStats;
  stats2?: PlayerStats;
  isLoading?: boolean;
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({
  player1,
  player2,
  stats1,
  stats2,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <TableContainer component={Paper} sx={{ position: 'relative', minHeight: 400 }}>
        <LoadingOverlay />
      </TableContainer>
    );
  }

  if (!stats1 || !stats2) {
    return (
      <Alert severity="error">
        Stats data not available
      </Alert>
    );
  }

  return (
    <TransitionComponent>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Category</TableCell>
              <TableCell align="right">{player1.name}</TableCell>
              <TableCell align="right">{player2.name}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {statCategories.map(category => (
              <React.Fragment key={category.category}>
                <TableRow>
                  <TableCell 
                    colSpan={3} 
                    sx={{ 
                      bgcolor: 'background.default',
                      fontWeight: 'bold'
                    }}
                  >
                    <Typography variant="subtitle2">
                      {category.category}
                    </Typography>
                  </TableCell>
                </TableRow>
                {category.stats.map(stat => (
                  <TableRow key={stat.key}>
                    <TableCell>{stat.label}</TableCell>
                    <StatsFormatter 
                      stat={stat.key}
                      value={stats1[stat.key]}
                      isPercentage={!!stat.suffix && stat.suffix === '%'}
                      precision={stat.format === '0.0' ? 1 : stat.format === '0.00' ? 2 : 0}
                    />
                    <StatsFormatter 
                      stat={stat.key}
                      value={stats2[stat.key]}
                      isPercentage={!!stat.suffix && stat.suffix === '%'}
                      precision={stat.format === '0.0' ? 1 : stat.format === '0.00' ? 2 : 0}
                    />
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </TransitionComponent>
  );
};

export default ComparisonTable;