import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { ArrowBack, ArrowForward, BoltOutlined, ContentCopy, Remove, CompareArrows, KeyboardArrowUp } from '@mui/icons-material';
import { useSearchParams, Link as RouterLink } from 'react-router-dom';
import PlayerSearch from '../components/PlayerSearch';
import PlayerAvatar from '../components/PlayerAvatar';
import UpcomingGames from '../components/UpcomingGames';
import { PlayerRadarChart } from '../components/PlayerRadarChart';
import { usePlayerStatsWithFallback, usePlayerPhoto, usePrediction } from '../hooks/useNbaData';
import { useAuth } from '../contexts/AuthContext';
import { Player } from '../types/player';
import { mapApiStatsToPlayerStats } from '../utils/dataMappers';
import { predictGame, RawPlayerStats } from '../utils/predictionEngine';
import SportsScoreIcon from '@mui/icons-material/SportsScore';

function confidenceColor(conf: string): 'success' | 'warning' | 'default' {
  if (conf === 'high') return 'success';
  if (conf === 'medium') return 'warning';
  return 'default';
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
];

const GamePredictor: React.FC = () => {
  const { user } = useAuth();
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
    if (s) {
      const parsed = parseInt(s);
      if (SEASONS.some(opt => opt.value === parsed)) setSeason(parsed);
    }
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

  const { data: rawStats1, isLoading: loading1, isError: statsError1, isFallback: isFallback1, effectiveSeason: effectiveSeason1 } = usePlayerStatsWithFallback(
    player1?.id.toString() ?? '',
    season,
  );
  const { data: rawStats2, isLoading: loading2, isError: statsError2, isFallback: isFallback2, effectiveSeason: effectiveSeason2 } = usePlayerStatsWithFallback(
    player2?.id.toString() ?? '',
    season,
  );

  const hasStats1 = !!rawStats1?.pts;
  const hasStats2 = !!rawStats2?.pts;

  // Resolve photos — use player.photoUrl if already set (from search), else fetch by name
  const { data: fetchedPhoto1 } = usePlayerPhoto(!player1?.photoUrl && !!player1 ? player1.name : '');
  const { data: fetchedPhoto2 } = usePlayerPhoto(!player2?.photoUrl && !!player2 ? player2.name : '');
  const resolvedPhoto1 = player1?.photoUrl ?? fetchedPhoto1 ?? undefined;
  const resolvedPhoto2 = player2?.photoUrl ?? fetchedPhoto2 ?? undefined;

  // Server-side 5-factor prediction (preferred)
  const { data: serverPrediction, isLoading: predLoading } = usePrediction(
    player1?.id.toString() ?? '',
    player2?.id.toString() ?? '',
    homeTeam,
    season,
  );

  // Client-side fallback if server unavailable
  const clientPrediction = useMemo(() => {
    if (serverPrediction) return null; // server wins
    if (!hasStats1 || !hasStats2) return null;
    return predictGame(rawStats1 as RawPlayerStats, rawStats2 as RawPlayerStats, homeTeam);
  }, [rawStats1, rawStats2, homeTeam, hasStats1, hasStats2, serverPrediction]);

  const prediction = serverPrediction ?? clientPrediction;
  const isServerPrediction = !!serverPrediction;

  // Track prediction events in localStorage for the /performance dashboard
  useEffect(() => {
    if (!prediction) return;
    const KEY = 'nba_prediction_log';
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const prev: string[] = JSON.parse(localStorage.getItem(KEY) || '[]');
    const trimmed = prev.filter(t => new Date(t).getTime() > cutoff);
    trimmed.push(new Date().toISOString());
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  }, [prediction]);

  const mappedStats1 = useMemo(
    () => (rawStats1 ? mapApiStatsToPlayerStats(rawStats1) : undefined),
    [rawStats1],
  );
  const mappedStats2 = useMemo(
    () => (rawStats2 ? mapApiStatsToPlayerStats(rawStats2) : undefined),
    [rawStats2],
  );

  const isLoading = loading1 || loading2 || (!!player1 && !!player2 && predLoading);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
        <Typography variant="h4">
          Matchup Edge
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ContentCopy fontSize="small" />}
          onClick={() => { navigator.clipboard.writeText(window.location.href); setCopied(true); }}
          sx={{ textTransform: 'none', fontSize: '0.75rem' }}
        >
          Share
        </Button>
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
          <ToggleButton value="1">{player1?.team || 'Team 1'}</ToggleButton>
          <ToggleButton value="neutral">Neutral</ToggleButton>
          <ToggleButton value="2">{player2?.team || 'Team 2'}</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Stats fetch errors */}
      {player1 && !loading1 && statsError1 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Could not load stats for {player1.name}. The stats API may be unavailable — check that your BallDontLie API key is set and your plan includes season averages.
        </Alert>
      )}
      {player2 && !loading2 && statsError2 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Could not load stats for {player2.name}. The stats API may be unavailable — check that your BallDontLie API key is set and your plan includes season averages.
        </Alert>
      )}

      {/* Auto-fallback info banners */}
      {player1 && !loading1 && isFallback1 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Not enough {SEASONS.find(s => s.value === season)?.label} games yet to compute a reliable average for {player1.name} — showing {SEASONS.find(s => s.value === effectiveSeason1)?.label}.
        </Alert>
      )}
      {player2 && !loading2 && isFallback2 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Not enough {SEASONS.find(s => s.value === season)?.label} games yet to compute a reliable average for {player2.name} — showing {SEASONS.find(s => s.value === effectiveSeason2)?.label}.
        </Alert>
      )}

      {/* No stats found even after fallback */}
      {player1 && !loading1 && !statsError1 && rawStats1 !== undefined && !hasStats1 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No season averages found for {player1.name}. Try selecting an older season.
        </Alert>
      )}
      {player2 && !loading2 && !statsError2 && rawStats2 !== undefined && !hasStats2 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No season averages found for {player2.name}. Try selecting an older season.
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

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PlayerAvatar name={player1.name} photoUrl={resolvedPhoto1} size={48} />
                <Typography variant="body2" fontWeight="bold" color="primary.main">
                  {player1.name} ({prediction.team1WinProbability.toFixed(0)}%)
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" fontWeight="bold" color="secondary.main">
                  {player2.name} ({(100 - prediction.team1WinProbability).toFixed(0)}%)
                </Typography>
                <PlayerAvatar name={player2.name} photoUrl={resolvedPhoto2} size={48} />
              </Box>
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
              <Chip
                label={isServerPrediction ? '5-Factor Model' : 'Basic Stats'}
                size="small"
                variant="outlined"
                color={isServerPrediction ? 'success' : 'default'}
                icon={<SportsScoreIcon />}
              />
            </Box>
          </Paper>

          {/* Factor Breakdown (server prediction only) */}
          {isServerPrediction && prediction.factors && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Factor Breakdown
              </Typography>
              <Grid container spacing={2}>
                {[
                  {
                    label: 'Team Record',
                    weight: '35%',
                    val1: prediction.factors.teamRecord.team1,
                    val2: prediction.factors.teamRecord.team2,
                    edge: prediction.factors.teamRecord.edge,
                  },
                  {
                    label: 'Star Net Rating',
                    weight: '20%',
                    val1: typeof prediction.factors.starNetRating.team1 === 'number' ? prediction.factors.starNetRating.team1.toFixed(1) : prediction.factors.starNetRating.team1,
                    val2: typeof prediction.factors.starNetRating.team2 === 'number' ? prediction.factors.starNetRating.team2.toFixed(1) : prediction.factors.starNetRating.team2,
                    edge: prediction.factors.starNetRating.edge,
                  },
                  {
                    label: 'Home Court',
                    weight: '15%',
                    val1: prediction.factors.homeCourt.team
                      ? `${prediction.factors.homeCourt.team} (+${Math.abs(prediction.factors.homeCourt.bonus).toFixed(1)})`
                      : 'Neutral',
                    val2: '',
                    edge: prediction.factors.homeCourt.bonus > 0 ? 1 as const
                      : prediction.factors.homeCourt.bonus < 0 ? 2 as const
                      : 'tie' as const,
                  },
                  {
                    label: 'Recent Form (L5)',
                    weight: '15%',
                    val1: typeof prediction.factors.recentForm.team1 === 'number' ? prediction.factors.recentForm.team1.toFixed(1) : prediction.factors.recentForm.team1,
                    val2: typeof prediction.factors.recentForm.team2 === 'number' ? prediction.factors.recentForm.team2.toFixed(1) : prediction.factors.recentForm.team2,
                    edge: prediction.factors.recentForm.edge,
                  },
                  {
                    label: 'Star Efficiency',
                    weight: '15%',
                    val1: typeof prediction.factors.starEfficiency.team1 === 'number' ? prediction.factors.starEfficiency.team1.toFixed(1) : prediction.factors.starEfficiency.team1,
                    val2: typeof prediction.factors.starEfficiency.team2 === 'number' ? prediction.factors.starEfficiency.team2.toFixed(1) : prediction.factors.starEfficiency.team2,
                    edge: prediction.factors.starEfficiency.edge,
                  },
                ].map((factor) => (
                  <Grid item xs={12} sm={6} md={4} key={factor.label}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderLeft: 4,
                        borderColor:
                          factor.edge === 1
                            ? 'primary.main'
                            : factor.edge === 2
                              ? 'secondary.main'
                              : 'divider',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" display="block">
                        {factor.label} ({factor.weight})
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                        <Typography
                          variant="body2"
                          fontWeight={factor.edge === 1 ? 'bold' : 'normal'}
                          color={factor.edge === 1 ? 'primary.main' : 'text.primary'}
                        >
                          {factor.val1 || '—'}
                        </Typography>
                        {factor.val2 !== '' && (
                          <Typography
                            variant="body2"
                            fontWeight={factor.edge === 2 ? 'bold' : 'normal'}
                            color={factor.edge === 2 ? 'secondary.main' : 'text.primary'}
                          >
                            {factor.val2 || '—'}
                          </Typography>
                        )}
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}

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
                  {prediction.advantages.map((adv: { label: string; team1Value: number; team2Value: number; winner: 1 | 2 | 'tie'; higherIsBetter: boolean }) => (
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

          {/* Post-Prediction CTAs */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1, mb: 2 }}>
            <Button
              variant="outlined"
              color="secondary"
              component={RouterLink}
              to="/edge"
              size="small"
              sx={{ textTransform: 'none' }}
            >
              View Edge Feed →
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<CompareArrows />}
              component={RouterLink}
              to={`/compare?p1=${player1.id}&p2=${player2.id}`}
              size="small"
              sx={{ textTransform: 'none' }}
            >
              Full Player Comparison
            </Button>
            <Button
              variant="text"
              size="small"
              startIcon={<KeyboardArrowUp />}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              sx={{ textTransform: 'none', color: 'text.secondary' }}
            >
              New Matchup
            </Button>
          </Box>
        </>
      )}

      {/* VIP Upsell */}
      {!user?.vipActive && (
        <Paper
          variant="outlined"
          sx={{ mt: 4, p: 3, textAlign: 'center', borderColor: 'primary.main', borderWidth: 2 }}
        >
          <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ mb: 1.5 }}>
            <BoltOutlined color="primary" />
            <Typography variant="h6" fontWeight={700}>
              Get the full edge
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            VIP Pro unlocks 20+ edges per stat, DM alerts, and research access.
          </Typography>
          <Button
            variant="contained"
            component={RouterLink}
            to="/pricing"
            sx={{ fontWeight: 700, borderRadius: 2, px: 3 }}
          >
            Join VIP Pro — $19/mo
          </Button>
        </Paper>
      )}

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mt: 2, display: 'block', textAlign: 'center' }}
      >
        Note: Predictions use team records, advanced stats, recent form, and pace data. For entertainment purposes only.
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
