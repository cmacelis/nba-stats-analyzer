import React from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Typography,
} from '@mui/material';
import { CheckCircle, Error as ErrorIcon, QueryStats } from '@mui/icons-material';
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

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const PerformanceDashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data: health, isLoading: healthLoading, isError: healthError } = useQuery<HealthData>({
    queryKey: ['health'],
    queryFn: () => axios.get(`${API_BASE}/api/health`).then(r => r.data),
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 1,
  });

  const handleSelectGame = (p1: Player, p2: Player) => {
    navigate(
      `/predict?p1=${p1.id}&p1n=${encodeURIComponent(p1.name)}&p1t=${encodeURIComponent(p1.team)}` +
      `&p2=${p2.id}&p2n=${encodeURIComponent(p2.name)}&p2t=${encodeURIComponent(p2.team)}&s=2024`
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

      {/* API Health */}
      <Paper sx={{ p: 2.5, mb: 3 }}>
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
            API is unreachable. Check that the backend is deployed and BALL_DONT_LIE_API_KEY is set.
          </Alert>
        ) : (
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Chip
                icon={<CheckCircle />}
                label="Operational"
                color="success"
                variant="outlined"
              />
            </Grid>
            <Grid item>
              <Typography variant="body2" color="text.secondary">
                Version: <strong>{health?.version}</strong>
              </Typography>
            </Grid>
            <Grid item>
              <Typography variant="body2" color="text.secondary">
                Uptime: <strong>{health?.uptime != null ? formatUptime(health.uptime) : '—'}</strong>
              </Typography>
            </Grid>
            <Grid item>
              <Typography variant="body2" color="text.secondary">
                Checked: <strong>{health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : '—'}</strong>
              </Typography>
            </Grid>
          </Grid>
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
