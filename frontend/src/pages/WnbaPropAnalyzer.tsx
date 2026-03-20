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
  NotificationsActive, BarChart,
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
    q: 'Does EdgeDetector.ai support WNBA props?',
    a: 'Yes. EdgeDetector.ai tracks momentum-based edges for WNBA players just like it does for the NBA. Toggle to WNBA in the Edge Feed to see which players are trending above or below their season averages.',
  },
  {
    q: 'How does the WNBA prop analyzer work?',
    a: 'We pull real game logs for every active WNBA player and compare their season-long average against their last 5 games. The difference (delta) is ranked, surfacing the biggest momentum swings first.',
  },
  {
    q: 'What WNBA stats are covered?',
    a: 'Currently the Edge Feed supports points (PTS) and PRA (Points + Rebounds + Assists combined) for WNBA players. More stat categories are coming soon.',
  },
  {
    q: 'When is the WNBA season?',
    a: 'The WNBA regular season typically runs from May through September, with playoffs in September and October. Edge data is available throughout the active season.',
  },
  {
    q: 'Is the WNBA edge feed free?',
    a: 'Yes. The top 5 edges per stat are free for both NBA and WNBA. VIP Pro ($19/mo) unlocks the full feed of 20+ edges, custom alerts, and the results dashboard across both leagues.',
  },
  {
    q: 'Can I get WNBA alerts on Discord?',
    a: 'VIP Pro members can set custom WNBA alert rules via the /track command in Discord. You define the player, stat, and direction, and we DM you when a matching edge appears.',
  },
];

// ── How-it-works steps ──────────────────────────────────────────────────────

const STEPS = [
  {
    icon: BarChart,
    title: 'Pull WNBA Game Logs',
    description: 'We fetch every active WNBA player\'s game-by-game stats for the current season.',
  },
  {
    icon: QueryStats,
    title: 'Calculate Momentum Delta',
    description: 'Season average vs. last 5 games — the delta reveals who is trending above or below baseline.',
  },
  {
    icon: TrendingUp,
    title: 'Rank & Surface Edges',
    description: 'Players are ranked by their momentum swing. The biggest discrepancies rise to the top.',
  },
];

// ── Structured data for SEO ─────────────────────────────────────────────────

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'EdgeDetector.ai WNBA Prop Analyzer',
  applicationCategory: 'SportsApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free tier with limited edges. VIP Pro starts at $19/month.',
  },
  description:
    'WNBA prop bet analyzer that compares season averages against recent performance to surface momentum-based statistical edges across active WNBA players.',
  url: 'https://edgedetector.ai/wnba-prop-analyzer',
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

const WnbaPropAnalyzer: React.FC = () => {
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
    document.title = 'WNBA Prop Bet Analyzer — Find Player Prop Edges | EdgeDetector.ai';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        'content',
        'Free WNBA prop bet analyzer that surfaces momentum-based edges across active players. Compare season averages vs. recent performance to find WNBA player prop edges.',
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
    funnelEvent('wnba-analyzer-view');
  }, []);

  // Inject JSON-LD structured data
  useEffect(() => {
    const scriptApp = document.createElement('script');
    scriptApp.type = 'application/ld+json';
    scriptApp.textContent = JSON.stringify(JSON_LD);
    scriptApp.id = 'ld-wnba-analyzer';
    document.head.appendChild(scriptApp);

    const scriptFaq = document.createElement('script');
    scriptFaq.type = 'application/ld+json';
    scriptFaq.textContent = JSON.stringify(FAQ_LD);
    scriptFaq.id = 'ld-wnba-faq';
    document.head.appendChild(scriptFaq);

    return () => {
      document.getElementById('ld-wnba-analyzer')?.remove();
      document.getElementById('ld-wnba-faq')?.remove();
    };
  }, []);

  return (
    <Box sx={{ animation: `${fadeIn} 0.5s ease-out` }}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <Box sx={{ textAlign: 'center', py: { xs: 6, md: 10 }, maxWidth: 760, mx: 'auto' }}>
        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2 }}>
          <Chip label="WNBA" color="secondary" size="small" sx={{ fontWeight: 700 }} />
          <Chip label="Free Tool" variant="outlined" size="small" sx={{ fontWeight: 700 }} />
        </Stack>
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
          WNBA Prop Bet Analyzer
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
          Find WNBA player prop edges using momentum data. Same engine as
          our NBA analyzer — built for the W.
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
            to="/edge?league=wnba"
            onMouseEnter={onHover}
            onClick={onClick}
            sx={{ fontWeight: 700, borderRadius: 2, px: 4, ...hoverLift }}
          >
            Open WNBA Edge Feed
          </Button>
          <Button
            variant="outlined"
            size="large"
            component={RouterLink}
            to="/nba-prop-analyzer"
            onMouseEnter={onHover}
            onClick={onClick}
            sx={{ borderRadius: 2, px: 3, ...hoverLift }}
          >
            NBA Prop Analyzer
          </Button>
        </Stack>
      </Box>

      {/* ── LIVE EDGE PREVIEW ─────────────────────────────────────────────── */}
      <Box sx={{ maxWidth: 820, mx: 'auto', mb: { xs: 6, md: 8 } }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
          Live WNBA Prop Edges — Points
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          WNBA players with the biggest momentum swings in scoring. Delta = last
          5 games average minus season average.
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
              WNBA edge feed temporarily unavailable — data source may be recovering. Try again in a few minutes.
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
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" fontWeight={600} sx={{ mb: 1 }}>
              WNBA season is not currently active
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Edges will populate here once the WNBA season begins (typically May–October).
              In the meantime, check out the NBA Edge Feed.
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              component={RouterLink}
              to="/edge"
              endIcon={<ArrowForward />}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              Open NBA Edge Feed
            </Button>
          </Paper>
        )}

        {previewEdges.length > 0 && (
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button
              variant="text"
              endIcon={<ArrowForward />}
              component={RouterLink}
              to="/edge?league=wnba"
              onMouseEnter={onHover}
              onClick={onClick}
            >
              See the full WNBA Edge Feed →
            </Button>
          </Box>
        )}
      </Box>

      {/* ── WHAT IS A WNBA PROP EDGE? ────────────────────────────────────── */}
      <Box sx={{ maxWidth: 760, mx: 'auto', mb: { xs: 6, md: 8 } }}>
        <Typography component="h2" variant="h5" fontWeight={700} sx={{ mb: 2 }}>
          What Is a WNBA Player Prop Edge?
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2, lineHeight: 1.8 }}>
          WNBA player prop markets are growing fast, but the lines are often
          set with less precision than NBA props. When a WNBA player&apos;s
          recent output diverges from their season baseline, that gap creates
          a <strong>momentum edge</strong> that may not be reflected in the
          current line.
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
          EdgeDetector.ai quantifies that gap for every active WNBA player
          using the same delta methodology we apply to the NBA. Because WNBA
          prop markets are thinner, momentum signals can be even more
          impactful.
        </Typography>
      </Box>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <Box sx={{ mb: { xs: 6, md: 8 } }}>
        <Typography component="h2" variant="h5" fontWeight={700} textAlign="center" sx={{ mb: 4 }}>
          How the WNBA Prop Analyzer Works
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

      {/* ── FEATURES GRID ─────────────────────────────────────────────────── */}
      <Box sx={{ mb: { xs: 6, md: 8 } }}>
        <Typography component="h2" variant="h5" fontWeight={700} textAlign="center" sx={{ mb: 4 }}>
          What&apos;s Included
        </Typography>
        <Grid container spacing={3}>
          {[
            {
              icon: BoltOutlined,
              title: 'WNBA Edge Feed',
              desc: 'Momentum-ranked edges for WNBA players. Same engine, same methodology as our NBA feed.',
              to: '/edge?league=wnba',
            },
            {
              icon: CompareArrows,
              title: 'Player Compare',
              desc: 'Head-to-head stats breakdown for any two players across both NBA and WNBA.',
              to: '/compare',
            },
            {
              icon: Speed,
              title: 'Matchup Edge',
              desc: 'Game-level predictions with win probability for upcoming WNBA matchups.',
              to: '/predict',
            },
            {
              icon: NotificationsActive,
              title: 'WNBA Alerts',
              desc: 'VIP Pro members get Discord DM alerts when a WNBA player hits a big momentum edge.',
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

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <Box sx={{ maxWidth: 760, mx: 'auto', mb: { xs: 6, md: 8 } }}>
        <Typography component="h2" variant="h5" fontWeight={700} textAlign="center" sx={{ mb: 3 }}>
          WNBA Prop Analyzer FAQ
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
            Ready to Find WNBA Edges?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Browse live WNBA edges for free or go VIP Pro for the full feed and alerts.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button
              variant="contained"
              color="secondary"
              size="large"
              endIcon={<ArrowForward />}
              component={RouterLink}
              to="/edge?league=wnba"
              onMouseEnter={onHover}
              onClick={onClick}
              sx={{ fontWeight: 700, borderRadius: 2, px: 4, ...hoverLift }}
            >
              Open WNBA Edge Feed
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
            { label: 'NBA Analyzer', to: '/nba-prop-analyzer' },
            { label: 'Compare', to: '/compare' },
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

export default WnbaPropAnalyzer;
