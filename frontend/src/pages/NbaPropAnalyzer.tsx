import React, { useEffect } from 'react';
import {
  Box, Typography, Button, Grid, Paper, Chip,
  Skeleton, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Divider, Stack, useTheme, alpha,
  Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import {
  TrendingUp, CompareArrows, BoltOutlined, ArrowForward,
  ExpandMore, Speed, QueryStats,
  NotificationsActive, BarChart, CheckCircle,
} from '@mui/icons-material';
import { useSound } from '../contexts/SoundContext';
import { useAuth } from '../contexts/AuthContext';
import { useEdgeFeed, EdgeEntry } from '../hooks/useNbaData';
import { fadeIn, slideIn, scaleIn, getStaggerDelay } from '../utils/animations';
import { funnelEvent } from '../lib/analytics';
import PlayerAvatar from '../components/PlayerAvatar';

// ── mini sparkline ──────────────────────────────────────────────────────────

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

// ── FAQ data ────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'What is an NBA prop edge?',
    a: 'A prop edge occurs when a player\'s recent performance significantly deviates from their season average. For example, if a player averages 22 points per game this season but has scored 28+ in their last 5 games, that positive momentum creates a statistical edge for the "over" on their points prop.',
  },
  {
    q: 'How does EdgeDetector.ai find prop edges?',
    a: 'We pull real game logs for every active NBA player and compare their season-long averages against their last 5 games. The difference (delta) is ranked, so you see the biggest momentum swings first. Data refreshes every 10 minutes during the season.',
  },
  {
    q: 'Is this free to use?',
    a: 'Yes. The top 5 edges per stat category are free, along with the player comparison tool and daily Edge of the Day pick. VIP Pro ($19/mo) unlocks the full feed of 20+ edges, custom alerts, and the results dashboard.',
  },
  {
    q: 'What stats does the prop analyzer cover?',
    a: 'Currently the Edge Feed supports points (PTS) and PRA (Points + Rebounds + Assists combined). We are expanding to individual rebounds, assists, three-pointers, and steals+blocks in upcoming releases.',
  },
  {
    q: 'How is this different from other prop tools?',
    a: 'Most prop tools show you odds or projections. EdgeDetector.ai focuses specifically on momentum — the gap between what a player usually does and what they\'ve been doing lately. It\'s a signal layer, not a picks service.',
  },
  {
    q: 'Can I get alerts when a big edge appears?',
    a: 'VIP Pro members can set custom alert rules using the /track command in Discord. You define the player, stat, and direction, and we DM you when a matching edge surfaces.',
  },
];

// ── How-it-works steps ──────────────────────────────────────────────────────

const STEPS = [
  {
    icon: BarChart,
    title: 'Pull Real Game Logs',
    description: 'We fetch every active NBA player\'s game-by-game stats for the current season.',
  },
  {
    icon: QueryStats,
    title: 'Calculate Momentum Delta',
    description: 'Season average vs. last 5 games — the delta reveals who is trending above or below their baseline.',
  },
  {
    icon: TrendingUp,
    title: 'Rank & Surface Edges',
    description: 'Players are ranked by the size of their momentum swing. The biggest discrepancies appear at the top.',
  },
];

// ── Comparison table ────────────────────────────────────────────────────────

const COMPARISON_ROWS = [
  { feature: 'Momentum-based edge detection', us: true, others: false },
  { feature: 'Live data (refreshes every 10 min)', us: true, others: false },
  { feature: 'Free tier with daily pick', us: true, others: false },
  { feature: 'Player-level L5 trend sparklines', us: true, others: false },
  { feature: 'Discord alert integration', us: true, others: false },
  { feature: 'Requires no login to browse', us: true, others: false },
];

// ── Structured data for SEO ─────────────────────────────────────────────────

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'EdgeDetector.ai NBA Prop Analyzer',
  applicationCategory: 'SportsApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free tier with limited edges. VIP Pro starts at $19/month.',
  },
  description:
    'NBA prop bet analyzer that compares season averages against recent performance to surface momentum-based statistical edges across active players.',
  url: 'https://edgedetector.ai/nba-prop-analyzer',
  aggregateRating: undefined, // omit until we have ratings
};

const FAQ_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
};

// ── Component ───────────────────────────────────────────────────────────────

const NbaPropAnalyzer: React.FC = () => {
  const theme = useTheme();
  const { playSound } = useSound();
  const { user } = useAuth();
  const { data: edgeData, isLoading, isError } = useEdgeFeed('pts', 20, 2025);
  const previewEdges: EdgeEntry[] = (edgeData?.data ?? []).slice(0, 5);

  const onHover = () => playSound('hover');
  const onClick = () => playSound('click');

  const hoverLift = {
    transition: 'transform 0.2s',
    '&:hover': { transform: 'scale(1.03)' },
  };

  // SEO: dynamic page title + meta description
  useEffect(() => {
    document.title = 'NBA Prop Bet Analyzer — Find Player Prop Edges | EdgeDetector.ai';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        'content',
        'Free NBA prop bet analyzer that surfaces momentum-based edges across active players. Compare season averages vs. recent performance to find player prop edges before the market adjusts.',
      );
    }
    return () => {
      document.title = 'EdgeDetector.ai — Statistical Edges in Player Props';
      if (meta) {
        meta.setAttribute(
          'content',
          'EdgeDetector.ai surfaces momentum-based statistical edges in NBA player props. Compare season averages against recent performance to find discrepancies before the market adjusts.',
        );
      }
    };
  }, []);

  // Funnel tracking
  useEffect(() => {
    funnelEvent('prop-analyzer-view');
  }, []);

  // Inject JSON-LD structured data
  useEffect(() => {
    const scriptApp = document.createElement('script');
    scriptApp.type = 'application/ld+json';
    scriptApp.textContent = JSON.stringify(JSON_LD);
    scriptApp.id = 'ld-prop-analyzer';
    document.head.appendChild(scriptApp);

    const scriptFaq = document.createElement('script');
    scriptFaq.type = 'application/ld+json';
    scriptFaq.textContent = JSON.stringify(FAQ_LD);
    scriptFaq.id = 'ld-prop-faq';
    document.head.appendChild(scriptFaq);

    return () => {
      document.getElementById('ld-prop-analyzer')?.remove();
      document.getElementById('ld-prop-faq')?.remove();
    };
  }, []);

  return (
    <Box sx={{ animation: `${fadeIn} 0.5s ease-out` }}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <Box sx={{ textAlign: 'center', py: { xs: 6, md: 10 }, maxWidth: 760, mx: 'auto' }}>
        <Chip label="Free Tool" color="secondary" size="small" sx={{ mb: 2, fontWeight: 700 }} />
        <Typography
          component="h1"
          variant="h3"
          sx={{
            fontWeight: 800,
            letterSpacing: '-0.02em',
            animation: `${fadeIn} 0.5s ease-out`,
            mb: 2,
          }}
        >
          NBA Prop Bet Analyzer
        </Typography>
        <Typography
          variant="h6"
          color="text.secondary"
          sx={{
            fontWeight: 400,
            animation: `${slideIn} 0.6s ease-out 0.15s`,
            animationFillMode: 'backwards',
            mb: 2,
            maxWidth: 600,
            mx: 'auto',
          }}
        >
          Find player prop edges before the market adjusts. Compare season
          averages against recent performance — updated every 10 minutes.
        </Typography>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="center"
          sx={{
            animation: `${scaleIn} 0.4s ease-out 0.3s`,
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
            Open the Edge Feed
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
            Compare Two Players
          </Button>
        </Stack>
      </Box>

      {/* ── LIVE EDGE PREVIEW ─────────────────────────────────────────────── */}
      <Box sx={{ maxWidth: 820, mx: 'auto', mb: { xs: 6, md: 8 } }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
          Live Prop Edges — Points
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Players with the biggest momentum swings in scoring right now. Delta
          = last 5 games average minus season average.
        </Typography>

        {isLoading && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Player</TableCell>
                  <TableCell align="center">Season Avg</TableCell>
                  <TableCell align="center">L5 Avg</TableCell>
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

        {isError && (
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Edge feed temporarily unavailable — data source may be recovering.
            </Typography>
          </Paper>
        )}

        {!isLoading && !isError && previewEdges.length > 0 && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Player</TableCell>
                  <TableCell align="center">Season Avg</TableCell>
                  <TableCell align="center">L5 Avg</TableCell>
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
                      <Typography variant="body2">{edge.season_avg.toFixed(1)}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight={600}>{edge.recent_avg.toFixed(1)}</Typography>
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

        {!isLoading && !isError && previewEdges.length === 0 && (
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {(edgeData as unknown as Record<string, unknown>)?.reason === 'upstream_error'
                ? 'Stats data temporarily unavailable — edges will return shortly.'
                : 'No qualifying edges right now. Check back when more games are being played.'}
            </Typography>
          </Paper>
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
            See the full Edge Feed →
          </Button>
        </Box>
      </Box>

      {/* ── WHAT IS A PROP EDGE? ──────────────────────────────────────────── */}
      <Box sx={{ maxWidth: 760, mx: 'auto', mb: { xs: 6, md: 8 } }}>
        <Typography component="h2" variant="h5" fontWeight={700} sx={{ mb: 2 }}>
          What Is an NBA Player Prop Edge?
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2, lineHeight: 1.8 }}>
          Sportsbooks set player prop lines based on season-long averages and
          public perception. But player performance isn&apos;t static — it
          fluctuates with matchups, minutes, health, and rhythm. When a
          player&apos;s recent output diverges meaningfully from their season
          baseline, that gap is a <strong>momentum edge</strong>.
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
          EdgeDetector.ai quantifies that gap for every active NBA player. We
          call it the <strong>delta</strong> — the difference between a
          player&apos;s last 5 games and their full-season average. A large
          positive delta means the player is on a hot streak. A large negative
          delta means they&apos;re cold. Either direction can be actionable
          depending on how the prop line is set.
        </Typography>
      </Box>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <Box sx={{ mb: { xs: 6, md: 8 } }}>
        <Typography component="h2" variant="h5" fontWeight={700} textAlign="center" sx={{ mb: 4 }}>
          How the Prop Analyzer Works
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

      {/* ── WHY EDGEDETECTOR vs MANUAL ────────────────────────────────────── */}
      <Box sx={{ maxWidth: 700, mx: 'auto', mb: { xs: 6, md: 8 } }}>
        <Typography component="h2" variant="h5" fontWeight={700} textAlign="center" sx={{ mb: 3 }}>
          EdgeDetector.ai vs. Manual Research
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Feature</TableCell>
                <TableCell align="center">EdgeDetector.ai</TableCell>
                <TableCell align="center">Manual</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {COMPARISON_ROWS.map((row) => (
                <TableRow key={row.feature}>
                  <TableCell>
                    <Typography variant="body2">{row.feature}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <CheckCircle fontSize="small" color="success" />
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" color="text.disabled">—</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* ── FEATURES GRID ─────────────────────────────────────────────────── */}
      <Box sx={{ mb: { xs: 6, md: 8 } }}>
        <Typography component="h2" variant="h5" fontWeight={700} textAlign="center" sx={{ mb: 4 }}>
          What&apos;s Included
        </Typography>
        <Grid container spacing={3}>
          {[
            {
              icon: BoltOutlined,
              title: 'Edge Feed',
              desc: 'Momentum-ranked edges for every active NBA player. Updated every 10 minutes during the season.',
              to: '/edge',
            },
            {
              icon: CompareArrows,
              title: 'Player Compare',
              desc: 'Head-to-head stats breakdown for any two players. Season averages, shooting splits, and more.',
              to: '/compare',
            },
            {
              icon: Speed,
              title: 'Matchup Edge',
              desc: 'Game-level predictions with win probability based on team and player statistics.',
              to: '/predict',
            },
            {
              icon: NotificationsActive,
              title: 'Custom Alerts',
              desc: 'VIP Pro members get Discord DM alerts when a player matching their rules hits a big edge.',
              to: '/pricing',
            },
          ].map((feat, i) => (
            <Grid item xs={12} sm={6} key={feat.title}>
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
                  {feat.desc}
                </Typography>
                <Button
                  variant="text"
                  size="small"
                  endIcon={<ArrowForward />}
                  component={RouterLink}
                  to={feat.to}
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

      {/* ── FAQ (SEO + Schema.org) ────────────────────────────────────────── */}
      <Box sx={{ maxWidth: 760, mx: 'auto', mb: { xs: 6, md: 8 } }}>
        <Typography component="h2" variant="h5" fontWeight={700} textAlign="center" sx={{ mb: 3 }}>
          Frequently Asked Questions
        </Typography>
        {FAQ_ITEMS.map((item, i) => (
          <Accordion
            key={i}
            variant="outlined"
            disableGutters
            sx={{
              '&:before': { display: 'none' },
              mb: 1,
              borderRadius: '8px !important',
              overflow: 'hidden',
            }}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle1" fontWeight={600}>
                {item.q}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                {item.a}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      {/* ── CTA BANNER ────────────────────────────────────────────────────── */}
      <Box sx={{ maxWidth: 720, mx: 'auto', mb: { xs: 6, md: 8 } }}>
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 3, md: 4 },
            textAlign: 'center',
            borderColor: 'secondary.main',
            borderWidth: 2,
          }}
        >
          <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
            Ready to Find Your Edge?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Browse live edges for free or go VIP Pro for the full feed, alerts, and research access.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
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
              Open Edge Feed — Free
            </Button>
            {!user?.vipActive && (
              <Button
                variant="outlined"
                size="large"
                component={RouterLink}
                to="/pricing"
                onMouseEnter={onHover}
                onClick={onClick}
                sx={{ borderRadius: 2, px: 3, ...hoverLift }}
              >
                View VIP Pro Plans
              </Button>
            )}
          </Stack>
        </Paper>
      </Box>

      {/* ── DISCLAIMER + FOOTER ───────────────────────────────────────────── */}
      <Divider />
      <Box sx={{ py: 4, textAlign: 'center', bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
        <Typography variant="caption" display="block" color="text.disabled" sx={{ mb: 1, lineHeight: 1.6, maxWidth: 600, mx: 'auto' }}>
          EdgeDetector.ai provides statistical insights and momentum tracking.
          This is not financial or gambling advice. Past performance does not
          guarantee future results.
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
        <Typography variant="caption" display="block" color="text.disabled">
          &copy; {new Date().getFullYear()} EdgeDetector.ai. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
};

export default NbaPropAnalyzer;
