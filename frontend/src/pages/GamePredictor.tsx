import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
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
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { ArrowBack, ArrowForward, ContentCopy, Remove } from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import PlayerSearch from '../components/PlayerSearch';
import UpcomingGames from '../components/UpcomingGames';
import { PlayerRadarChart } from '../components/PlayerRadarChart';
import { usePlayerStats } from '../hooks/useNbaData';
import { Player } from '../types/player';
import { mapApiStatsToPlayerStats } from '../utils/dataMappers';
import { predictGame, RawPlayerStats } from '../utils/predictionEngine';

function confidenceColor(conf: string): 'success' | 'warning' | 'error' {
  if (conf === 'high') return 'success';
  if (conf === 'medium') return 'warning';
  return 'error';
}

function lastName(name: string): string {
  const parts = name.split(' ');
  return parts[parts.length - 1];
}

const SEASONS = [
  { value: 2025, label: '2025-26' },
  { value: 2024, label: '2024-25' },
  { value: 2023, label: '2023-24' },
  { value: 2022, label: '2022-23' },
  { value: 2021, label: '2021-22' },
  { value: 2020, label: '2020-21' },
];

const GamePredictor: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [player1, setPlayer1] = useState<Player | null>(null);
  const [player2, setPlayer2] = useState<Player | null>(null);
  const [homeCourtValue, setHomeCourtValue] = useState<string | null>(null);
  const [season, setSeason] = useState(2025);
  const [copied, setCopied] = useState(false);
  const predictorRef = useRef<HTMLDivElement>(null);

  // On mount, restore state from URL params
  useEffect(() => {
    const p1id = searchParams.get('p1');
    const p1name = searchParams.get('p1n');
    const p1team = searchParams.get('p1t');
    const p2id = searchParams.get('p2');
    const p2name = searchParams.get('p2n');
    const p2team = searchParams.get('p2t');
    const s = searchParams.get('s');
    const hc = searchParams.get('hc');
    if (p1id && p1name) setPlayer1({ id: parseInt(p1id), name: p1name, team: p1team || '', position: '' });
    if (p2id && p2name) setPlayer2({ id: parseInt(p2id), name: p2name, team: p2team || '', position: '' });
    if (s) setSeason(parseInt(s));
    if (hc) setHomeCourtValue(hc);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep URL in sync with state
  useEffect(() => {
    const params: Record<string, string> = { s: season.toString() };
    if (player1) { params.p1 = player1.id.toString(); params.p1n = player1.name; params.p1t = player1.team; }
    if (player2) { params.p2 = player2.id.toString(); params.p2n = player2.name; params.p2t = player2.team; }
    if (homeCourtValue) params.hc = homeCourtValue;
    setSearchParams(params, { replace: true });
  }, [player1, player2, season, homeCourtValue, setSearchParams]);

  const handleSelectGame = (p1: Player, p2: Player) => {
    setPlayer1(p1);
    setPlayer2(p2);
    setSeason(2025);
    setTimeout(() => {
      predictorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const homeTeam: 1 | 2 | null =
    homeCourtValue === '1' ? 1 : homeCourtValue === '2' ? 2 : null;

  const { data: rawStats1, isLoading: loading1 } = usePlayerStats(
    player1?.id.toString() ?? '',
    season,
  );
  const { data: rawStats2, isLoading: loading2 } = usePlayerStats(
    player2?.id.toString() ?? '',
    season,
  );

  const hasStats1 = !!rawStats1?.pts;
  const hasStats2 = !!rawStats2?.pts;

  const prediction = useMemo(() => {
    if (!hasStats1 || !hasStats2) return null;
    return predictGame(rawStats1 as RawPlayerStats, rawStats2 as RawPlayerStats, homeTeam);
  }, [rawStats1, rawStats2, homeTeam, hasStats1, hasStats2]);

  const mappedStats1 = useMemo(
    () => (rawStats1 ? mapApiStatsToPlayerStats(rawStats1) : undefined),
    [rawStats1],
  );
  const mappedStats2 = useMemo(
    () => (rawStats2 ? mapApiStatsToPlayerStats(rawStats2) : undefined),
    [rawStats2],
  );

  const isLoading = loading1 || loading2;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Typography variant="h4">
          Matchup Edge
        </Typography>
        <Tooltip title="Copy shareable link">
          <IconButton size="small" onClick={() => { navigator.clipboard.writeText(window.location.href); setCopied(true); }}>
            <ContentCopy fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Select each team's star player to predict the game outcome.
      </Typography>

      <UpcomingGames onSelectGame={handleSelectGame} />

      {/* Player Selection */}
      <Grid ref={predictorRef} container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <PlayerSearch label="Team 1 Star Player" value={player1} onChange={setPlayer1} />
        </Grid>
        <Grid item xs={12} md={6}>
          <PlayerSearch label="Team 2 Star Player" value={player2} onChange={setPlayer2} />
        </Grid>
      </Grid>

      {/* Season Selector */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="body1" fontWeight="medium">Season:</Typography>
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

      {/* Home Court Toggle */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="body1" fontWeight="medium">
          Home Court:
        </Typography>
        <ToggleButtonGroup
          value={homeCourtValue}
          exclusive
          onChange={(_e, val: string | null) => setHomeCourtValue(val)}
          size="small"
        >
          <ToggleButton value="1">{player1?.name ?? 'Team 1'}</ToggleButton>
          <ToggleButton value="neutral">Neutral</ToggleButton>
          <ToggleButton value="2">{player2?.name ?? 'Team 2'}</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* No-stats warnings */}
      {player1 && !loading1 && rawStats1 !== undefined && !hasStats1 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No {SEASONS.find(s => s.value === season)?.label} stats available for {player1.name}. Try a different season.
        </Alert>
      )}
      {player2 && !loading2 && rawStats2 !== undefined && !hasStats2 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No {SEASONS.find(s => s.value === season)?.label} stats available for {player2.name}. Try a different season.
        </Alert>
      )}

      {/* Loading spinner */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Prediction Results */}
      {prediction && player1 && player2 && (
        <>
          {/* Win Probability */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Win Probability
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" fontWeight="bold" color="primary.main">
                {player1.name} ({prediction.team1WinProbability.toFixed(0)}%)
              </Typography>
              <Typography variant="body2" fontWeight="bold" color="secondary.main">
                {player2.name} ({(100 - prediction.team1WinProbability).toFixed(0)}%)
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'flex',
                height: 36,
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  width: `${prediction.team1WinProbability}%`,
                  bgcolor: 'primary.main',
                  transition: 'width 0.5s ease',
                }}
              />
              <Box
                sx={{
                  width: `${100 - prediction.team1WinProbability}%`,
                  bgcolor: 'secondary.main',
                  transition: 'width 0.5s ease',
                }}
              />
            </Box>

            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="body1">
                Projected Score:{' '}
                <strong>
                  {player1.team} {prediction.projectedScore1}
                </strong>{' '}
                –{' '}
                <strong>
                  {player2.team} {prediction.projectedScore2}
                </strong>
              </Typography>
              <Chip
                label={`${prediction.confidence.charAt(0).toUpperCase() + prediction.confidence.slice(1)} Confidence`}
                color={confidenceColor(prediction.confidence)}
                size="small"
              />
            </Box>
          </Paper>

          {/* Stat Breakdown */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Stat Breakdown
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Stat</TableCell>
                    <TableCell align="center">{player1.name}</TableCell>
                    <TableCell align="center">{player2.name}</TableCell>
                    <TableCell align="center">Edge</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {prediction.advantages.map(adv => (
                    <TableRow key={adv.label}>
                      <TableCell>{adv.label}</TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: adv.winner === 1 ? 'bold' : 'normal',
                          color: adv.winner === 1 ? 'primary.main' : 'text.primary',
                        }}
                      >
                        {adv.team1Value}
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: adv.winner === 2 ? 'bold' : 'normal',
                          color: adv.winner === 2 ? 'secondary.main' : 'text.primary',
                        }}
                      >
                        {adv.team2Value}
                      </TableCell>
                      <TableCell align="center">
                        {adv.winner === 'tie' ? (
                          <Remove fontSize="small" color="disabled" />
                        ) : adv.winner === 1 ? (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 0.5,
                              color: 'primary.main',
                            }}
                          >
                            <ArrowBack fontSize="small" color="primary" />
                            <Typography variant="caption" color="primary">
                              {lastName(player1.name)}
                            </Typography>
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 0.5,
                              color: 'secondary.main',
                            }}
                          >
                            <Typography variant="caption" color="secondary">
                              {lastName(player2.name)}
                            </Typography>
                            <ArrowForward fontSize="small" color="secondary" />
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Radar Chart */}
          <PlayerRadarChart
            player1={player1}
            player2={player2}
            stats1={mappedStats1}
            stats2={mappedStats2}
            isLoading={false}
          />
        </>
      )}

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mt: 2, display: 'block', textAlign: 'center' }}
      >
        Note: Predictions are based on {SEASONS.find(s => s.value === season)?.label} season averages and are for entertainment purposes only.
      </Typography>

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message="Link copied to clipboard"
      />
    </Box>
  );
};

export default GamePredictor;
