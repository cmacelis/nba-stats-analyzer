import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
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
  PeopleOutlined,
  BoltOutlined,
  AttachMoney,
  TrendingUp,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

// ── Types ───────────────────────────────────────────────────────────────────

interface AdminStats {
  generatedAt: string;
  users: {
    total: number;
    free: number;
    vip: number;
    vipMonthly: number;
    vipAnnual: number;
    discordConnected: number;
  };
  revenue: {
    estimatedMrr: number;
    note: string;
  };
  recentSignups: Array<{
    email: string;
    createdAt: string;
    vipActive: boolean;
    vipPlan: string | null;
    discordConnected: boolean;
  }>;
  signupsByDay: Record<string, number>;
  stripeEvents: Array<{
    type: string;
    created: string;
    email: string | null;
    amount: number | null;
  }>;
}

// ── Stat Card ───────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color?: string;
}> = ({ label, value, sub, icon, color = 'primary.main' }) => (
  <Card sx={{ flex: 1, minWidth: 180 }}>
    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ color, fontSize: 36, display: 'flex' }}>{icon}</Box>
      <Box>
        <Typography variant="h4" fontWeight={800}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.disabled">
            {sub}
          </Typography>
        )}
      </Box>
    </CardContent>
  </Card>
);

// ── Stripe Event Label ──────────────────────────────────────────────────────

function eventLabel(type: string): { label: string; color: 'success' | 'error' | 'info' | 'warning' } {
  if (type.includes('completed')) return { label: 'Checkout', color: 'success' };
  if (type.includes('created')) return { label: 'Sub Created', color: 'success' };
  if (type.includes('deleted')) return { label: 'Cancelled', color: 'error' };
  if (type.includes('payment_succeeded')) return { label: 'Payment OK', color: 'success' };
  if (type.includes('payment_failed')) return { label: 'Payment Failed', color: 'error' };
  if (type.includes('updated')) return { label: 'Sub Updated', color: 'info' };
  return { label: type.split('.').pop() || type, color: 'info' };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Main Component ──────────────────────────────────────────────────────────

const Admin: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setError('You must be signed in to access this page.');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch('/api/auth?_subpath=admin/stats', {
          credentials: 'same-origin',
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        setStats(await res.json());
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!stats) return null;

  const { users, revenue, recentSignups, signupsByDay, stripeEvents } = stats;

  // Sort signupsByDay for display
  const sortedDays = Object.entries(signupsByDay)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 14);

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Admin Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Last updated: {new Date(stats.generatedAt).toLocaleString()}
        </Typography>
      </Box>

      {/* KPI Cards */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 4 }}>
        <StatCard
          label="Total Users"
          value={users.total}
          icon={<PeopleOutlined fontSize="inherit" />}
        />
        <StatCard
          label="VIP Pro"
          value={users.vip}
          sub={`${users.vipMonthly} monthly / ${users.vipAnnual} annual`}
          icon={<BoltOutlined fontSize="inherit" />}
          color="warning.main"
        />
        <StatCard
          label="Free Users"
          value={users.free}
          icon={<PeopleOutlined fontSize="inherit" />}
          color="text.secondary"
        />
        <StatCard
          label="Est. MRR"
          value={`$${revenue.estimatedMrr}`}
          sub={revenue.note}
          icon={<AttachMoney fontSize="inherit" />}
          color="success.main"
        />
      </Box>

      {/* Additional Metrics */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 4 }}>
        <StatCard
          label="Discord Connected"
          value={users.discordConnected}
          sub={users.total ? `${Math.round((users.discordConnected / users.total) * 100)}% of users` : ''}
          icon={<TrendingUp fontSize="inherit" />}
          color="info.main"
        />
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Two-column layout: Recent Signups + Stripe Events */}
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Recent Signups */}
        <Paper variant="outlined" sx={{ flex: 1, minWidth: 340, p: 2 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Recent Signups (7d)
          </Typography>
          {recentSignups.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No signups in the last 7 days.
            </Typography>
          ) : (
            <List dense disablePadding>
              {recentSignups.map((s, i) => (
                <ListItem key={i} disableGutters divider={i < recentSignups.length - 1}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                          {s.email}
                        </Typography>
                        {s.vipActive && (
                          <Chip label={s.vipPlan || 'VIP'} size="small" color="warning" />
                        )}
                        {s.discordConnected && (
                          <Chip label="Discord" size="small" variant="outlined" />
                        )}
                      </Box>
                    }
                    secondary={timeAgo(s.createdAt)}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>

        {/* Stripe Events */}
        <Paper variant="outlined" sx={{ flex: 1, minWidth: 340, p: 2 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Stripe Events (Recent 25)
          </Typography>
          {stripeEvents.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No recent Stripe events (or STRIPE_SECRET_KEY not configured).
            </Typography>
          ) : (
            <List dense disablePadding>
              {stripeEvents.map((e, i) => {
                const { label, color } = eventLabel(e.type);
                return (
                  <ListItem key={i} disableGutters divider={i < stripeEvents.length - 1}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip label={label} size="small" color={color} />
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {e.email || 'unknown'}
                          </Typography>
                          {e.amount != null && (
                            <Typography variant="body2" fontWeight={700} color="success.main">
                              ${e.amount}
                            </Typography>
                          )}
                        </Box>
                      }
                      secondary={timeAgo(e.created)}
                    />
                  </ListItem>
                );
              })}
            </List>
          )}
        </Paper>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Signups by Day Table */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Daily Signups (Last 14d)
        </Typography>
        {sortedDays.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No signup data available.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Signups</TableCell>
                  <TableCell>Bar</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedDays.map(([day, count]) => {
                  const max = Math.max(...sortedDays.map(([, c]) => c));
                  const pct = max > 0 ? (count / max) * 100 : 0;
                  return (
                    <TableRow key={day}>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{day}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {count}
                      </TableCell>
                      <TableCell sx={{ width: '40%' }}>
                        <Box
                          sx={{
                            height: 16,
                            width: `${pct}%`,
                            minWidth: count > 0 ? 8 : 0,
                            bgcolor: 'primary.main',
                            borderRadius: 1,
                            transition: 'width 0.3s',
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Data Source Legend */}
      <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Chip label="LIVE: Firestore users" size="small" color="success" variant="outlined" />
        <Chip label="LIVE: Stripe events API" size="small" color="success" variant="outlined" />
        <Chip label="ESTIMATED: MRR" size="small" color="warning" variant="outlined" />
        <Chip label="NOT SYNCED: Vercel Analytics" size="small" color="default" variant="outlined" />
      </Box>
    </Box>
  );
};

export default Admin;
