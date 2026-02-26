import React, { useMemo } from 'react';
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
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  BookmarkAdded,
  CheckCircle,
  Error as ErrorIcon,
  QueryStats,
  TrackChanges,
  Storage,
  HubOutlined,
} from '@mui/icons-material';
import { usePickHistory } from '../hooks/useNbaData';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import UpcomingGames from '../components/UpcomingGames';
import { PerformanceMetrics } from '../components/performance/PerformanceMetrics';
import { Player } from '../types/player';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

interface HealthData {
  status: string;
  version: string;
  uptime: number;
  timestamp: string;
}

const ENDPOINTS = [
  { path: '/api/health',                    label: 'Health check',          method: 'GET'  },
  { path: '/api/players?search=',           label: 'Player search',         method: 'GET'  },
  { path: '/api/players/:id/stats',         label: 'Player season stats',   method: 'GET'  },
  { path: '/api/players/compare/:id1/:id2', label: 'Head-to-head compare',  method: 'GET'  },
  { path: '/api/players/photo',             label: 'Player headshot URL',   method: 'GET'  },
  { path: '/api/games',                     label: 'Upcoming games (odds)', method: 'GET'  },
  { path: '/api/research/generate',         label: 'AI edge research',      method: 'POST' },
  { path: '/api/edge',                      label: 'Edge Feed (momentum)',  method: 'GET'  },
  { path: '/api/picks',                     label: 'Pick history (read)',   method: 'GET'  },
  { path: '/api/picks',                     label: 'Track new pick',        method: 'POST' },
  { path: '/api/alerts/run',               label: 'Discord alert run',     method: 'POST' },
];

const CACHES = [
  { label: 'NBA Roster (name → person ID)', ttl: '24 h',   scope: 'Server',  note: 'Populated on first player search per Vercel instance' },
  { label: 'Player stats / search',         ttl: '5 min',  scope: 'Browser', note: 'React Query stale time' },
  { label: 'Player photos',                 ttl: '24 h',   scope: 'Browser', note: 'React Query stale time' },
  { label: 'Upcoming games (odds)',          ttl: '5 min',  scope: 'Browser', note: 'React Query stale time' },
  { label: 'Prediction result',             ttl: 'Session', scope: 'Browser', note: 'React useMemo — recalculates on player or season change' },
  { label: 'Tracked picks',                 ttl: '90 days', scope: 'Server',  note: 'Vercel KV (Redis sorted set); pruned automatically on write' },
];

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function usePredictionCounts() {
  return useMemo(() => {
    const KEY = 'nba_prediction_log';
    const now = Date.now();
    const log: string[] = JSON.parse(localStorage.getItem(KEY) || '[]');
    return {
      last7d:  log.filter(t => new Date(t).getTime() > now - 7  * 86_400_000).length,
      last30d: log.filter(t => new Date(t).getTime() > now - 30 * 86_400_000).length,
    };
  }, []);
}

const PerformanceDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { last7d, last30d } = usePredictionCounts();

  const picks30 = usePickHistory('30d');
  const now = Date.now();
  const allPicks   = picks30.data?.data ?? [];
  const picks7d    = allPicks.filter(p => new Date(p.created_at).getTime() > now - 7 * 86_400_000);
  const picks7dCount    = picks7d.length;
  const picks30dCount   = allPicks.length;
  const signals7d       = picks7d.filter(p => p.type === 'signal').length;
  const bets7d          = picks7d.filter(p => p.type === 'bet').length;
  const signals30d      = allPicks.filter(p => p.type === 'signal').length;
  const bets30d         = allPicks.filter(p => p.type === 'bet').length;
  const recentPicks     = allPicks.slice(0, 5);
  const picksConfigured = picks30.data?.configured ?? true; // assume configured until we know otherwise

  const { data: health, isLoading: healthLoading, isError: healthError } = useQuery<HealthData>({
    queryKey: ['health'],
    queryFn: () => axios.get(`${API_BASE}/api/health`).then(r => r.data),
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 1,
  });

  const apiOk = !healthLoading && !healthError && !!health;

  const handleSelectGame = (p1: Player, p2: Player) => {
    navigate(
      `/predict?p1=${p1.id}&p1n=${encodeURIComponent(p1.name)}&p1t=${encodeURIComponent(p1.team)}` +
      `&p2=${p2.id}&p2n=${encodeURIComponent(p2.name)}&p2t=${encodeURIComponent(p2.team)}&s=2025`
    );
  };

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <QueryStats color="primary" />
        <Typography variant="h4" fontWeight={700}>
          App Status
        </Typography>
      </Box>

      {/* Row 1: API Health + Prediction Activity */}
      <Grid container spacing={3} sx={{ mb: 3 }}>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              API Health
            </Typography>
            {healthLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">Checking…</Typography>
              </Box>
            ) : healthError ? (
              <Alert severity="error" icon={<ErrorIcon />}>
                API unreachable — check backend deployment and <code>BALL_DONT_LIE_API_KEY</code>.
              </Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Chip icon={<CheckCircle />} label="Operational" color="success" variant="outlined"
                  sx={{ alignSelf: 'flex-start' }} />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Version: <strong>{health?.version}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Uptime: <strong>{health?.uptime != null ? formatUptime(health.uptime) : '—'}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Checked: <strong>{health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : '—'}</strong>
                  </Typography>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <TrackChanges fontSize="small" color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Prediction Activity
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Matchup Edge predictions run in this browser.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" fontWeight={700} color="primary.main">
                    {last7d}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Last 7 days</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" fontWeight={700} color="text.primary">
                    {last30d}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Last 30 days</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

      </Grid>

      {/* Active Endpoints */}
      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <HubOutlined fontSize="small" color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Active Endpoints
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Path</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Method</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ENDPOINTS.map((ep, i) => (
                <TableRow key={`${ep.path}-${ep.method}-${i}`}>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'text.secondary' }}>
                    {ep.path}
                  </TableCell>
                  <TableCell>{ep.label}</TableCell>
                  <TableCell>
                    <Chip label={ep.method} size="small" variant="outlined"
                      color={ep.method === 'POST' ? 'secondary' : 'default'} />
                  </TableCell>
                  <TableCell>
                    {healthLoading ? (
                      <CircularProgress size={14} />
                    ) : (
                      <Chip
                        size="small"
                        label={apiOk ? 'Active' : 'Unknown'}
                        color={apiOk ? 'success' : 'default'}
                        variant="outlined"
                        icon={apiOk ? <CheckCircle /> : undefined}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Cache Info */}
      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Storage fontSize="small" color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Cache Configuration
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Cache</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>TTL</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Scope</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {CACHES.map(c => (
                <TableRow key={c.label}>
                  <TableCell>{c.label}</TableCell>
                  <TableCell>
                    <Chip label={c.ttl} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip label={c.scope} size="small"
                      color={c.scope === 'Server' ? 'primary' : 'default'} variant="outlined" />
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{c.note}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Tracked Picks */}
      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <BookmarkAdded fontSize="small" color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Tracked Picks
          </Typography>
          {picks30.isLoading && <CircularProgress size={16} />}
        </Box>

        {!picks30.isLoading && !picksConfigured && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Picks are stored in this browser only. To sync across devices, set up Vercel KV:{' '}
            <code>vercel kv create nba-picks &amp;&amp; vercel env pull</code>
          </Alert>
        )}

        {picks30.isError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Could not load pick history. Backend may be unreachable.
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mb: recentPicks.length > 0 ? 2 : 0 }}>
          <Grid item xs={6}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" fontWeight={700} color="primary.main">
                {picks30.isLoading ? '—' : picks7dCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">Last 7 days</Typography>
              {!picks30.isLoading && picks7dCount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, mt: 0.5 }}>
                  <Chip label={`${signals7d} signal${signals7d !== 1 ? 's' : ''}`} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
                  <Chip label={`${bets7d} bet${bets7d !== 1 ? 's' : ''}`} size="small" color="secondary" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
                </Box>
              )}
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" fontWeight={700} color="text.primary">
                {picks30.isLoading ? '—' : picks30dCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">Last 30 days</Typography>
              {!picks30.isLoading && picks30dCount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, mt: 0.5 }}>
                  <Chip label={`${signals30d} signal${signals30d !== 1 ? 's' : ''}`} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
                  <Chip label={`${bets30d} bet${bets30d !== 1 ? 's' : ''}`} size="small" color="secondary" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>

        {recentPicks.length > 0 && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
              Recent picks
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Player</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Stat</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Direction</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Line</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Confidence</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentPicks.map(pick => (
                    <TableRow key={pick.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{pick.player_name}</Typography>
                        <Typography variant="caption" color="text.secondary">{pick.team}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={pick.type === 'bet' ? 'Bet' : 'Signal'}
                          size="small"
                          color={pick.type === 'bet' ? 'secondary' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip label={(pick.stat ?? (pick as never as { market: string }).market ?? '?').toUpperCase()} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={pick.direction.charAt(0).toUpperCase() + pick.direction.slice(1)}
                          size="small"
                          color={pick.direction === 'over' ? 'success' : 'error'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>
                        {pick.line != null ? pick.line : '—'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={pick.confidence_tier}
                          size="small"
                          color={pick.confidence_tier === 'high' ? 'success' : pick.confidence_tier === 'medium' ? 'warning' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>
                        {new Date(pick.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {!picks30.isLoading && !picks30.isError && picks30dCount === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
            No picks tracked yet — use the <strong>Edge Feed</strong> to log your first pick.
          </Typography>
        )}
      </Paper>

      {/* Upcoming Games */}
      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Upcoming Games
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Click any game to open it in Matchup Edge.
        </Typography>
        <UpcomingGames onSelectGame={handleSelectGame} />
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* Web Vitals */}
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Page Performance
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Real-time Web Vitals for this browser session.
      </Typography>
      <Paper sx={{ p: 3 }}>
        <PerformanceMetrics />
      </Paper>
    </Box>
  );
};

export default PerformanceDashboard;
