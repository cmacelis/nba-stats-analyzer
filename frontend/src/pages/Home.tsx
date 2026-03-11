import React from 'react';
import {
  Box, Typography, Button, Grid, Paper, Chip,
  Skeleton, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Divider, Stack, useTheme, alpha,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import {
  TrendingUp, CompareArrows, ShowChart, Psychology,
  Speed, BoltOutlined, ArrowForward, Star,
} from '@mui/icons-material';
import { useSound } from '../contexts/SoundContext';
import { useAuth } from '../contexts/AuthContext';
import { useEdgeFeed, EdgeEntry } from '../hooks/useNbaData';
import { fadeIn, slideIn, scaleIn, getStaggerDelay } from '../utils/animations';
import PlayerAvatar from '../components/PlayerAvatar';

// ── mini sparkline (copied from EdgeDetector.tsx) ───────────────────────────

const Sparkline: React.FC<{ values: number[]; seasonAvg: number }> = ({ values, seasonAvg }) => {
  const theme = useTheme();
  const h = 24, barW = 6, gap = 3;
  const w = values.length * (barW + gap) - gap;
  const max = Math.max(...values, seasonAvg) * 1.1 || 1;

  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      {values.map((v, i) => {
        const barH = Math.max(2, Math.round((v / max) * h));
        const color = v >= seasonAvg ? theme.palette.success.main : theme.palette.error.main;
        return (
          <rect key={i} x={i * (barW + gap)} y={h - barH}
            width={barW} height={barH} rx={1} fill={color} opacity={0.85} />
        );
      })}
    </svg>
  );
};

// ── constants ────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: BoltOutlined,
    title: 'Edge Feed',
    description: 'Momentum-based edges across all active players. Updated every 10 minutes.',
    link: '/edge',
  },
  {
    icon: CompareArrows,
    title: 'Player Compare',
    description: 'Head-to-head statistical comparison between any two players.',
    link: '/compare',
  },
  {
    icon: ShowChart,
    title: 'Matchup Edge',
    description: 'Game predictions with win probability for upcoming matchups.',
    link: '/predict',
  },
  {
    icon: Psychology,
    title: 'Deep Analysis',
    description: 'AI-powered edge signals with context on why a player is trending.',
    link: '/compare',
  },
] as const;

const STEPS = [
  {
    icon: Speed,
    title: 'Track Momentum',
    description: 'We monitor season averages vs. recent performance for every active player.',
  },
  {
    icon: TrendingUp,
    title: 'Surface Edges',
    description: 'Statistical discrepancies are highlighted\u2009\u2014\u2009players trending above or below their baseline.',
  },
  {
    icon: Psychology,
    title: 'You Decide',
    description: 'Use real data to make informed decisions. No hype, no guarantees\u2009\u2014\u2009just the numbers.',
  },
] as const;

// ── component ────────────────────────────────────────────────────────────────

const Home: React.FC = () => {
  const theme = useTheme();
  const { playSound } = useSound();
  const { user } = useAuth();
  const { data: edgeData, isLoading: edgeLoading, isError: edgeError } = useEdgeFeed('pts', 20, 2025);
  const previewEdges: EdgeEntry[] = (edgeData?.data ?? []).slice(0, 5);

  const onHover = () => playSound('hover');
  const onClick = () => playSound('click');

  // shared button hover sx
  const hoverLift = {
    transition: 'transform 0.2s',
    '&:hover': { transform: 'scale(1.03)' },
  };

  return (
    <Box sx={{ animation: `${fadeIn} 0.5s ease-out` }}>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <Box sx={{
        textAlign: 'center',
        py: { xs: 6, md: 10 },
        maxWidth: 720,
        mx: 'auto',
      }}>
        <Typography
          variant="h2"
          sx={{
            fontWeight: 800,
            letterSpacing: '-0.02em',
            animation: `${fadeIn} 0.5s ease-out`,
            mb: 2,
          }}
        >
          EdgeDetector.ai
        </Typography>

        <Typography
          variant="h5"
          color="text.secondary"
          sx={{
            fontWeight: 400,
            animation: `${slideIn} 0.6s ease-out 0.15s`,
            animationFillMode: 'backwards',
            mb: 2,
          }}
        >
          Spot player prop edges before the market adjusts.
        </Typography>

        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2.5 }}>
          <Chip label="NBA" color="primary" size="small" />
          <Chip
            label="WNBA Live"
            variant="outlined"
            size="small"
            component={RouterLink}
            to="/wnba-prop-analyzer"
            clickable
          />
        </Stack>

        <Typography
          variant="body1"
          color="text.secondary"
          sx={{
            maxWidth: 540,
            mx: 'auto',
            mb: 4,
            animation: `${slideIn} 0.6s ease-out 0.25s`,
            animationFillMode: 'backwards',
          }}
        >
          We compare season averages against recent performance to surface
          momentum-based discrepancies across active players.
        </Typography>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="center"
          sx={{
            animation: `${scaleIn} 0.4s ease-out 0.35s`,
            animationFillMode: 'backwards',
          }}
        >
          <Button
            variant="contained"
            color="secondary"
            size="large"
            endIcon={<ArrowForward />}
            component={RouterLink}
            to="/edge"
            onMouseEnter={onHover}
            onClick={onClick}
            sx={{ fontWeight: 700, borderRadius: 2, px: 4, ...hoverLift }}
          >
            Explore the Edge Feed
          </Button>
          <Button
            variant="outlined"
            size="large"
            component={RouterLink}
            to="/compare"
            onMouseEnter={onHover}
            onClick={onClick}
            sx={{ borderRadius: 2, px: 3, ...hoverLift }}
          >
            Compare Players
          </Button>
        </Stack>
      </Box>

      {/* ── LIVE EDGE PREVIEW ───────────────────────────────────────────── */}
      <Box sx={{ maxWidth: 800, mx: 'auto', mb: { xs: 6, md: 8 } }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
          Live Edge Feed
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          Delta compares recent performance to season baseline.
        </Typography>

        {edgeLoading && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Player</TableCell>
                  <TableCell align="center">Season</TableCell>
                  <TableCell align="center">L5</TableCell>
                  <TableCell align="center">Delta</TableCell>
                  <TableCell align="center">Trend</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[0, 1, 2].map((i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton width={16} /></TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Skeleton variant="circular" width={36} height={36} />
                        <Box>
                          <Skeleton width={100} />
                          <Skeleton width={40} />
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="center"><Skeleton width={30} sx={{ mx: 'auto' }} /></TableCell>
                    <TableCell align="center"><Skeleton width={30} sx={{ mx: 'auto' }} /></TableCell>
                    <TableCell align="center"><Skeleton width={50} sx={{ mx: 'auto' }} /></TableCell>
                    <TableCell align="center"><Skeleton width={40} sx={{ mx: 'auto' }} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {edgeError && (
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Edge feed temporarily unavailable.
            </Typography>
            <Button
              variant="outlined"
              size="small"
              component={RouterLink}
              to="/edge"
              sx={{ mt: 1.5 }}
            >
              Go to Edge Feed
            </Button>
          </Paper>
        )}

        {!edgeLoading && !edgeError && previewEdges.length === 0 && (
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No edges available right now. Check back when games are in season.
            </Typography>
          </Paper>
        )}

        {!edgeLoading && !edgeError && previewEdges.length > 0 && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Player</TableCell>
                  <TableCell align="center">Season</TableCell>
                  <TableCell align="center">L5</TableCell>
                  <TableCell align="center">Delta</TableCell>
                  <TableCell align="center">Trend</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {previewEdges.map((edge, i) => (
                  <TableRow
                    key={edge.player_id}
                    sx={{
                      animation: `${slideIn} 0.3s ease-out ${getStaggerDelay(i, 80)}`,
                      animationFillMode: 'backwards',
                    }}
                  >
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <PlayerAvatar
                          name={edge.player_name}
                          photoUrl={edge.photo_url ?? undefined}
                          size={36}
                        />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {edge.player_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {edge.team_abbrev}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {edge.season_avg.toFixed(1)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight={600}>
                        {edge.recent_avg.toFixed(1)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        icon={<TrendingUp sx={{ fontSize: 14 }} />}
                        label={`${edge.delta > 0 ? '+' : ''}${edge.delta.toFixed(1)}`}
                        color={edge.delta > 0 ? 'success' : 'error'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Sparkline values={edge.last5} seasonAvg={edge.season_avg} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Button
            variant="text"
            endIcon={<ArrowForward />}
            component={RouterLink}
            to="/edge"
            onMouseEnter={onHover}
            onClick={onClick}
          >
            See full Edge Feed
          </Button>
        </Box>
      </Box>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <Box sx={{ mb: { xs: 6, md: 8 } }}>
        <Typography variant="h5" fontWeight={700} textAlign="center" sx={{ mb: 4 }}>
          How It Works
        </Typography>
        <Grid container spacing={4}>
          {STEPS.map((step, i) => (
            <Grid item xs={12} md={4} key={step.title}>
              <Box sx={{
                textAlign: 'center',
                animation: `${scaleIn} 0.4s ease-out ${getStaggerDelay(i, 120)}`,
                animationFillMode: 'backwards',
              }}>
                <Box sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  bgcolor: alpha(theme.palette.secondary.main, 0.12),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}>
                  <step.icon sx={{ fontSize: 28, color: 'secondary.main' }} />
                </Box>
                <Typography variant="overline" color="text.secondary">
                  Step {i + 1}
                </Typography>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                  {step.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300, mx: 'auto' }}>
                  {step.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* ── FEATURE CARDS ───────────────────────────────────────────────── */}
      <Box sx={{ mb: { xs: 6, md: 8 } }}>
        <Typography variant="h5" fontWeight={700} textAlign="center" sx={{ mb: 4 }}>
          What You Can Do
        </Typography>
        <Grid container spacing={3}>
          {FEATURES.map((feat, i) => (
            <Grid item xs={12} sm={6} md={3} key={feat.title}>
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'box-shadow 0.2s ease',
                  '&:hover': { boxShadow: theme.shadows[4] },
                  animation: `${fadeIn} 0.4s ease-out ${getStaggerDelay(i, 100)}`,
                  animationFillMode: 'backwards',
                }}
              >
                <Box sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  bgcolor: alpha(theme.palette.secondary.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                }}>
                  <feat.icon sx={{ color: 'secondary.main' }} />
                </Box>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                  {feat.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                  {feat.description}
                </Typography>
                <Button
                  variant="text"
                  size="small"
                  endIcon={<ArrowForward />}
                  component={RouterLink}
                  to={feat.link}
                  onMouseEnter={onHover}
                  onClick={onClick}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Explore
                </Button>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* ── VIP PRO TEASER ──────────────────────────────────────────────── */}
      {!user?.vipActive && (
        <Box sx={{ mb: { xs: 6, md: 8 }, maxWidth: 720, mx: 'auto' }}>
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 3, md: 4 },
              textAlign: 'center',
              borderColor: 'secondary.main',
              borderWidth: 2,
            }}
          >
            <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ mb: 2 }}>
              <BoltOutlined sx={{ color: 'secondary.main' }} />
              <Chip label="VIP Pro" color="secondary" size="small" />
            </Stack>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
              Act Faster With Less Noise
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Personalized alerts, deeper signal access, and the full edge feed.
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              justifyContent="center"
              sx={{ mb: 3 }}
            >
              <Chip icon={<Star />} label="20+ edges per stat" variant="outlined" size="small" />
              <Chip icon={<Star />} label="DM & Discord alerts" variant="outlined" size="small" />
              <Chip icon={<Star />} label="Research access" variant="outlined" size="small" />
            </Stack>
            <Button
              variant="contained"
              color="secondary"
              size="large"
              component={RouterLink}
              to="/pricing"
              onMouseEnter={onHover}
              onClick={onClick}
              sx={{ fontWeight: 700, borderRadius: 2, px: 4, mb: 1, ...hoverLift }}
            >
              View Plans
            </Button>
            <Typography variant="caption" display="block" color="text.secondary">
              Starting at $19/mo. Cancel anytime.
            </Typography>
          </Paper>
        </Box>
      )}

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <Divider />
      <Box sx={{
        py: 4,
        textAlign: 'center',
        bgcolor: alpha(theme.palette.primary.main, 0.03),
      }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
          EdgeDetector.ai
        </Typography>
        <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" sx={{ mb: 2 }}>
          {[
            { label: 'Edge Feed', to: '/edge' },
            { label: 'Compare', to: '/compare' },
            { label: 'Matchup Edge', to: '/predict' },
            { label: 'Pricing', to: '/pricing' },
          ].map((nav) => (
            <Button
              key={nav.to}
              variant="text"
              size="small"
              component={RouterLink}
              to={nav.to}
              sx={{ color: 'text.secondary' }}
            >
              {nav.label}
            </Button>
          ))}
        </Stack>
        <Typography variant="caption" display="block" color="text.disabled" sx={{ mb: 0.5 }}>
          Player data powered by BallDontLie
        </Typography>
        <Typography variant="caption" display="block" color="text.disabled">
          &copy; {new Date().getFullYear()} EdgeDetector.ai. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
};

export default Home;
