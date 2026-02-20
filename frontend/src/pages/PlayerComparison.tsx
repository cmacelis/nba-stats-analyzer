import React, { useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import PlayerSearch from '../components/PlayerSearch';
import { usePlayerComparison } from '../hooks/useNbaData';
import { Player } from '../types/player';

interface StatRow {
  label: string;
  key: string;
  format?: (v: number) => string;
  higherIsBetter?: boolean;
}

const STAT_ROWS: StatRow[] = [
  { label: 'Points', key: 'pts', higherIsBetter: true },
  { label: 'Rebounds', key: 'reb', higherIsBetter: true },
  { label: 'Assists', key: 'ast', higherIsBetter: true },
  { label: 'Steals', key: 'stl', higherIsBetter: true },
  { label: 'Blocks', key: 'blk', higherIsBetter: true },
  { label: 'Turnovers', key: 'turnover', higherIsBetter: false },
  { label: 'FG%', key: 'fg_pct', format: (v) => `${(v * 100).toFixed(1)}%`, higherIsBetter: true },
  { label: '3P%', key: 'fg3_pct', format: (v) => `${(v * 100).toFixed(1)}%`, higherIsBetter: true },
  { label: 'FT%', key: 'ft_pct', format: (v) => `${(v * 100).toFixed(1)}%`, higherIsBetter: true },
  { label: 'Off. Reb', key: 'oreb', higherIsBetter: true },
  { label: 'Def. Reb', key: 'dreb', higherIsBetter: true },
  { label: 'Personal Fouls', key: 'pf', higherIsBetter: false },
  { label: 'Games Played', key: 'games_played', higherIsBetter: true },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getVal(stats: any, key: string): number {
  return stats?.[key] ?? 0;
}

function fmt(val: number, format?: (v: number) => string): string {
  if (format) return format(val);
  return val.toFixed(1);
}

const PlayerComparison: React.FC = () => {
  const theme = useTheme();
  const [player1, setPlayer1] = useState<Player | null>(null);
  const [player2, setPlayer2] = useState<Player | null>(null);

  const { data, isLoading, error } = usePlayerComparison(
    player1?.id?.toString() || '',
    player2?.id?.toString() || ''
  );

  const hasData = player1 && player2 && data?.player1 && data?.player2;

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom fontWeight={700}>
        Player Comparison
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        2024–25 season averages
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <PlayerSearch
            label="Player 1"
            value={player1}
            onChange={setPlayer1}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <PlayerSearch
            label="Player 2"
            value={player2}
            onChange={setPlayer2}
          />
        </Grid>
      </Grid>

      {!player1 || !player2 ? (
        <Alert severity="info">Select two players above to compare their stats.</Alert>
      ) : isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 6 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">Failed to load comparison data. Please try again.</Alert>
      ) : !hasData ? (
        <Alert severity="warning">
          No 2024–25 season stats found for one or both players.
        </Alert>
      ) : (
        <Paper elevation={2}>
          {/* Header row with player names */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              p: 2,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              borderRadius: '4px 4px 0 0',
            }}
          >
            <Typography variant="subtitle2" fontWeight={600}>Stat</Typography>
            <Typography variant="subtitle2" fontWeight={600} textAlign="center">
              {player1.name}
            </Typography>
            <Typography variant="subtitle2" fontWeight={600} textAlign="center">
              {player2.name}
            </Typography>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableBody>
                {STAT_ROWS.map((row, i) => {
                  const v1 = getVal(data.player1, row.key);
                  const v2 = getVal(data.player2, row.key);
                  const p1Better = row.higherIsBetter ? v1 > v2 : v1 < v2;
                  const p2Better = row.higherIsBetter ? v2 > v1 : v2 < v1;

                  return (
                    <TableRow
                      key={row.key}
                      sx={{ bgcolor: i % 2 === 0 ? 'background.default' : 'background.paper' }}
                    >
                      <TableCell sx={{ fontWeight: 500, color: 'text.secondary', width: '33%' }}>
                        {row.label}
                      </TableCell>
                      <TableCell align="center" sx={{ width: '33%' }}>
                        <Chip
                          label={fmt(v1, row.format)}
                          size="small"
                          sx={{
                            fontWeight: p1Better ? 700 : 400,
                            bgcolor: p1Better
                              ? theme.palette.success.light
                              : p2Better
                              ? theme.palette.action.hover
                              : 'transparent',
                            color: p1Better ? theme.palette.success.dark : 'text.primary',
                            border: 'none',
                            minWidth: 60,
                          }}
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ width: '33%' }}>
                        <Chip
                          label={fmt(v2, row.format)}
                          size="small"
                          sx={{
                            fontWeight: p2Better ? 700 : 400,
                            bgcolor: p2Better
                              ? theme.palette.success.light
                              : p1Better
                              ? theme.palette.action.hover
                              : 'transparent',
                            color: p2Better ? theme.palette.success.dark : 'text.primary',
                            border: 'none',
                            minWidth: 60,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider />
          <Box sx={{ p: 1.5, display: 'flex', gap: 2, alignItems: 'center' }}>
            <Box
              sx={{
                width: 12, height: 12, borderRadius: 1,
                bgcolor: theme.palette.success.light, flexShrink: 0
              }}
            />
            <Typography variant="caption" color="text.secondary">
              Green highlight = better value for that stat
            </Typography>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default PlayerComparison;
