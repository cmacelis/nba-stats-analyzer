import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { ContentCopy } from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import PlayerSearch from '../components/PlayerSearch';
import PlayerAvatar from '../components/PlayerAvatar';
import ResearchPanel from '../components/ResearchPanel';
import { usePlayerComparison } from '../hooks/useNbaData';
import { Player } from '../types/player';

interface StatRow {
  label: string;
  key: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  format?: (v: any) => string;
  higherIsBetter?: boolean;
}

const STAT_ROWS: StatRow[] = [
  { label: 'Points', key: 'pts', higherIsBetter: true },
  { label: 'Rebounds', key: 'reb', higherIsBetter: true },
  { label: 'Assists', key: 'ast', higherIsBetter: true },
  { label: 'Steals', key: 'stl', higherIsBetter: true },
  { label: 'Blocks', key: 'blk', higherIsBetter: true },
  { label: 'Turnovers', key: 'turnover', higherIsBetter: false },
  { label: 'Minutes', key: 'min', format: (v) => typeof v === 'string' ? v : Number(v).toFixed(1), higherIsBetter: true },
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
  const val = stats?.[key] ?? 0;
  // 'min' comes back as a "MM:SS" string — convert to decimal minutes for comparison
  if (key === 'min' && typeof val === 'string') {
    const [mins, secs] = val.split(':').map(Number);
    return mins + (secs || 0) / 60;
  }
  return val;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fmt(val: any, format?: (v: any) => string): string {
  if (format) return format(val);
  if (typeof val === 'number') return val.toFixed(1);
  return String(val);
}

const SEASONS = [
  { value: 2024, label: '2024-25' },
  { value: 2023, label: '2023-24' },
  { value: 2022, label: '2022-23' },
  { value: 2021, label: '2021-22' },
  { value: 2020, label: '2020-21' },
];

const PlayerComparison: React.FC = () => {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [player1, setPlayer1] = useState<Player | null>(null);
  const [player2, setPlayer2] = useState<Player | null>(null);
  const [season, setSeason] = useState(2024);
  const [copied, setCopied] = useState(false);

  // On mount, restore state from URL params
  useEffect(() => {
    const p1id = searchParams.get('p1');
    const p1name = searchParams.get('p1n');
    const p1team = searchParams.get('p1t');
    const p2id = searchParams.get('p2');
    const p2name = searchParams.get('p2n');
    const p2team = searchParams.get('p2t');
    const s = searchParams.get('s');
    if (p1id && p1name) setPlayer1({ id: parseInt(p1id), name: p1name, team: p1team || '', position: '' });
    if (p2id && p2name) setPlayer2({ id: parseInt(p2id), name: p2name, team: p2team || '', position: '' });
    if (s) {
      const parsed = parseInt(s);
      if (SEASONS.some(opt => opt.value === parsed)) setSeason(parsed);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep URL in sync with state
  useEffect(() => {
    const params: Record<string, string> = { s: season.toString() };
    if (player1) { params.p1 = player1.id.toString(); params.p1n = player1.name; params.p1t = player1.team; }
    if (player2) { params.p2 = player2.id.toString(); params.p2n = player2.name; params.p2t = player2.team; }
    setSearchParams(params, { replace: true });
  }, [player1, player2, season, setSearchParams]);

  const { data, isLoading, error } = usePlayerComparison(
    player1?.id?.toString() || '',
    player2?.id?.toString() || '',
    season,
  );

  const hasData = player1 && player2 && data?.player1 && data?.player2;
  const seasonLabel = SEASONS.find(s => s.value === season)?.label ?? '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Typography variant="h4" fontWeight={700}>
          Player Comparison
        </Typography>
        <Tooltip title="Copy shareable link">
          <IconButton size="small" onClick={handleCopyLink}>
            <ContentCopy fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Season averages for
        </Typography>
        <FormControl size="small">
          <InputLabel id="season-label">Season</InputLabel>
          <Select
            labelId="season-label"
            value={season}
            label="Season"
            onChange={(e) => setSeason(e.target.value as number)}
          >
            {SEASONS.map((s) => (
              <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <PlayerSearch label="Player 1" value={player1} onChange={setPlayer1} />
        </Grid>
        <Grid item xs={12} md={6}>
          <PlayerSearch label="Player 2" value={player2} onChange={setPlayer2} />
        </Grid>
      </Grid>

      {!player1 || !player2 ? (
        <Alert severity="info">Select two players above to compare their stats.</Alert>
      ) : isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 6 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        (() => {
          const isPlanError = axios.isAxiosError<{ error: string }>(error) && error.response?.data?.error === 'plan_required';
          return (
            <Alert severity={isPlanError ? 'warning' : 'error'}>
              {isPlanError
                ? 'Season stats require a BallDontLie paid plan. Check that BALL_DONT_LIE_API_KEY is set correctly on the backend.'
                : 'Failed to load comparison data. Please try again.'}
            </Alert>
          );
        })()
      ) : !hasData ? (
        <Alert severity="info">
          No {seasonLabel} stats found for one or both players. Try selecting an older season from the dropdown above.
        </Alert>
      ) : (
        <Paper elevation={2}>
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
            <Typography variant="subtitle2" fontWeight={600} sx={{ alignSelf: 'center' }}>Stat</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
              <PlayerAvatar
                name={player1.name}
                photoUrl={player1.photoUrl}
                size={56}
                sx={{ border: '2px solid rgba(255,255,255,0.5)' }}
              />
              <Typography variant="subtitle2" fontWeight={600} textAlign="center">
                {player1.name}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
              <PlayerAvatar
                name={player2.name}
                photoUrl={player2.photoUrl}
                size={56}
                sx={{ border: '2px solid rgba(255,255,255,0.5)', bgcolor: 'secondary.main' }}
              />
              <Typography variant="subtitle2" fontWeight={600} textAlign="center">
                {player2.name}
              </Typography>
            </Box>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableBody>
                {STAT_ROWS.map((row, i) => {
                  const v1 = getVal(data.player1, row.key);
                  const v2 = getVal(data.player2, row.key);
                  const p1Better = row.higherIsBetter ? v1 > v2 : v1 < v2;
                  const p2Better = row.higherIsBetter ? v2 > v1 : v2 < v1;
                  // For display, use the raw API value so 'min' shows as "35:24"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const raw1 = (data.player1 as any)?.[row.key] ?? 0;
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const raw2 = (data.player2 as any)?.[row.key] ?? 0;

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
                          label={fmt(raw1, row.format)}
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
                          label={fmt(raw2, row.format)}
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

      {(player1 || player2) && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Edge Signal
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <ResearchPanel playerName={player1?.name ?? null} />
            </Grid>
            <Grid item xs={12} md={6}>
              <ResearchPanel playerName={player2?.name ?? null} />
            </Grid>
          </Grid>
        </Box>
      )}

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message="Link copied to clipboard"
      />
    </Box>
  );
};

export default PlayerComparison;
