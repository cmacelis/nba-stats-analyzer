import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
  useTheme,
  alpha,
} from '@mui/material';
import {
  CheckCircle,
  BoltOutlined,
  ArrowForward,
  PersonOutline,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { funnelEvent, trackServerFunnel } from '../lib/analytics';
import { fadeIn, slideIn, scaleIn } from '../utils/animations';
import SignInModal from '../components/SignInModal';

// Discord SVG icon (matches Layout.tsx)
const DiscordIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const Welcome: React.FC = () => {
  const theme = useTheme();
  const { user, loading } = useAuth();
  const [signInOpen, setSignInOpen] = useState(false);

  // Track onboarding page view
  useEffect(() => {
    funnelEvent('onboarding-view');
    trackServerFunnel('onboarding_view', { sourcePage: '/welcome' });
  }, []);

  // Auto-open sign-in modal for unauthenticated visitors
  useEffect(() => {
    if (!loading && !user) {
      setSignInOpen(true);
    }
  }, [loading, user]);

  if (loading) return null;

  // ── Unauthenticated state: show signup prompt inline ──────────────────────
  if (!user) {
    return (
      <Box sx={{
        maxWidth: 600,
        mx: 'auto',
        py: { xs: 4, md: 6 },
        px: 2,
        animation: `${fadeIn} 0.5s ease-out`,
      }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" fontWeight={800}>
            Get Free Access
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
            Create your account to unlock player comparisons, edge signals, and daily picks.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            No credit card required.
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            startIcon={<PersonOutline />}
            onClick={() => setSignInOpen(true)}
            sx={{ fontWeight: 700, borderRadius: 2, px: 4, mb: 2 }}
          >
            Create Free Account
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Already have an account? Click above to sign in with your email.
          </Typography>
        </Box>

        <SignInModal
          open={signInOpen}
          onClose={() => setSignInOpen(false)}
          subtitle="Create your free account — no credit card required."
          redirectTo="/welcome"
        />
      </Box>
    );
  }

  // ── Authenticated state: onboarding steps ─────────────────────────────────
  const discordDone = user.discordConnected;

  return (
    <Box sx={{
      maxWidth: 600,
      mx: 'auto',
      py: { xs: 4, md: 6 },
      px: 2,
      animation: `${fadeIn} 0.5s ease-out`,
    }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography
          variant="h4"
          fontWeight={800}
          sx={{
            animation: `${slideIn} 0.5s ease-out 0.1s`,
            animationFillMode: 'backwards',
          }}
        >
          Welcome to EdgeDetector.ai
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{
            mt: 1,
            animation: `${slideIn} 0.5s ease-out 0.2s`,
            animationFillMode: 'backwards',
          }}
        >
          Your free account is ready. Let's get you set up.
        </Typography>
      </Box>

      {/* Step 1: Account Created */}
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          mb: 2,
          borderColor: 'success.main',
          bgcolor: alpha(theme.palette.success.main, 0.04),
          animation: `${scaleIn} 0.4s ease-out 0.3s`,
          animationFillMode: 'backwards',
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <CheckCircle color="success" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              Step 1: Account Created
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Signed in as <strong>{user.email}</strong>
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Step 2: Connect Discord */}
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          mb: 2,
          borderColor: discordDone ? 'success.main' : '#5865F2',
          borderWidth: discordDone ? 1 : 2,
          bgcolor: discordDone
            ? alpha(theme.palette.success.main, 0.04)
            : alpha('#5865F2', 0.04),
          animation: `${scaleIn} 0.4s ease-out 0.4s`,
          animationFillMode: 'backwards',
        }}
      >
        {discordDone ? (
          <Stack direction="row" spacing={2} alignItems="center">
            <CheckCircle color="success" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                Step 2: Discord Connected
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user.discordUsername || 'Linked'} — you'll get alerts in Discord.
              </Typography>
            </Box>
          </Stack>
        ) : (
          <>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <Box sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: '#5865F2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                flexShrink: 0,
              }}>
                <DiscordIcon size={22} />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Step 2: Connect Discord
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Get the Edge of the Day pick and community alerts delivered to you.
                </Typography>
              </Box>
            </Stack>
            <Button
              variant="contained"
              fullWidth
              startIcon={<DiscordIcon size={18} />}
              onClick={() => {
                funnelEvent('discord-connect-click');
                trackServerFunnel('discord_connect_click', { sourcePage: '/welcome' });
                window.location.href = '/api/auth?_subpath=discord/start';
              }}
              sx={{
                bgcolor: '#5865F2',
                '&:hover': { bgcolor: '#4752C4' },
                fontWeight: 700,
                borderRadius: 2,
                textTransform: 'none',
                py: 1.2,
                fontSize: '0.95rem',
              }}
            >
              Connect Discord — Free
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
              Takes 10 seconds. We'll never spam you.
            </Typography>
          </>
        )}
      </Paper>

      {/* Skip / Continue */}
      <Box sx={{
        textAlign: 'center',
        mt: 4,
        animation: `${fadeIn} 0.5s ease-out 0.5s`,
        animationFillMode: 'backwards',
      }}>
        <Button
          variant="contained"
          color="secondary"
          size="large"
          endIcon={<ArrowForward />}
          component={RouterLink}
          to="/edge"
          onClick={() => {
            if (!discordDone) {
              trackServerFunnel('onboarding_skip', { sourcePage: '/welcome' });
            }
          }}
          sx={{ fontWeight: 700, borderRadius: 2, px: 4, mb: 2 }}
        >
          {discordDone ? 'Go to Edge Feed' : 'Skip for Now — Go to Edge Feed'}
        </Button>
        {!discordDone && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            You can connect Discord anytime from your profile menu.
          </Typography>
        )}
      </Box>

      {/* What's included */}
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          mt: 4,
          animation: `${fadeIn} 0.5s ease-out 0.6s`,
          animationFillMode: 'backwards',
        }}
      >
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
          Your Free Account Includes:
        </Typography>
        <Stack spacing={1}>
          {[
            'Player comparison tool',
            'Limited edge feed (top 5)',
            'Basic matchup predictions',
            'Edge of the Day (free daily pick)',
          ].map((item) => (
            <Stack key={item} direction="row" spacing={1} alignItems="center">
              <CheckCircle fontSize="small" color="success" />
              <Typography variant="body2">{item}</Typography>
            </Stack>
          ))}
        </Stack>
        <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <BoltOutlined fontSize="small" color="primary" />
            <Typography variant="body2" color="text.secondary">
              Want full edge feed, DM alerts, and research?{' '}
              <Chip
                label="VIP Pro — $19/mo"
                size="small"
                color="primary"
                variant="outlined"
                component={RouterLink}
                to="/pricing"
                clickable
                sx={{ fontWeight: 600 }}
              />
            </Typography>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
};

export default Welcome;
