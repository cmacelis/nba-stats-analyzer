import React, { useEffect, useCallback, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
  useTheme,
} from '@mui/material';
import {
  BoltOutlined,
  CheckCircle,
  LockOpen,
  RemoveCircleOutline,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { funnelEvent } from '../lib/analytics';
import { useAuth } from '../contexts/AuthContext';

// ── Stripe Payment Links ───────────────────────────────────────────────────
const STRIPE_LINK_MONTHLY = 'https://buy.stripe.com/bJe6oH3yx3NT1fS5qx97G02';
const STRIPE_LINK_ANNUAL  = 'https://buy.stripe.com/dRmcN5c53esxf6IbOV97G03';

// ── Plan features ──────────────────────────────────────────────────────────

const FREE_FEATURES = [
  { text: 'Player comparison tool', included: true },
  { text: 'Limited edge feed (top 5)', included: true },
  { text: 'Basic matchup edge', included: true },
  { text: 'Edge of the Day (daily free pick)', included: true },
  { text: 'DM alert rules (/track)', included: false },
  { text: 'VIP alerts channels', included: false },
  { text: 'Full edge feed (20+)', included: false },
  { text: 'Research access', included: false },
  { text: 'Results dashboard', included: false },
];

const VIP_FEATURES = [
  { text: 'Player comparison tool', included: true },
  { text: 'Full edge feed (20+ edges)', included: true },
  { text: 'Advanced matchup edge', included: true },
  { text: 'Edge of the Day (daily free pick)', included: true },
  { text: 'DM alert rules (/track)', included: true },
  { text: 'VIP alerts channels', included: true },
  { text: 'Research access', included: true },
  { text: 'Results dashboard', included: true },
];

// ── Component ──────────────────────────────────────────────────────────────

// Discord SVG icon (matches Layout.tsx)
const DiscordIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const Pricing: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  // Telegram ref param (e.g. "tg_123456") — when present, use server-side checkout
  const ref = searchParams.get('ref') || undefined;

  // Track pricing page view as a funnel event
  useEffect(() => {
    funnelEvent('pricing-view');
  }, []);

  /**
   * Start checkout via server-side session (passes client_reference_id for Telegram linking).
   * Falls back to direct Payment Links when no ref is present.
   */
  const startCheckout = useCallback(async (plan: 'monthly' | 'annual') => {
    setCheckoutLoading(plan);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, ref }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('[pricing] checkout error:', data.error);
        setCheckoutLoading(null);
      }
    } catch (err) {
      console.error('[pricing] checkout fetch error:', err);
      setCheckoutLoading(null);
    }
  }, [ref]);
  const cardSx = {
    p: 3,
    borderRadius: 3,
    flex: 1,
    minWidth: 280,
    maxWidth: 420,
    display: 'flex',
    flexDirection: 'column' as const,
  };

  return (
    <Box sx={{ p: 3, maxWidth: 960, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Typography variant="h3" fontWeight={800} gutterBottom>
          Pricing
        </Typography>
        <Typography variant="h6" color="text.secondary" fontWeight={400}>
          Free tools for everyone. VIP Pro for serious edge hunters.
        </Typography>
      </Box>

      {/* VIP Discord CTA — top of page */}
      {user?.vipActive && !user.discordConnected && (
        <Alert
          severity="info"
          icon={<DiscordIcon size={22} />}
          action={
            <Button
              size="small"
              variant="contained"
              onClick={() => {
                window.location.href = '/api/auth?_subpath=discord/start';
              }}
              sx={{
                bgcolor: '#5865F2',
                '&:hover': { bgcolor: '#4752C4' },
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: 2,
              }}
            >
              Connect Discord
            </Button>
          }
          sx={{ mb: 4, borderRadius: 2 }}
        >
          <Typography variant="body2" fontWeight={600}>
            You're VIP Pro! Connect Discord to get your role + DM alerts.
          </Typography>
        </Alert>
      )}
      {user?.vipActive && user.discordConnected && (
        <Alert
          severity="success"
          icon={<CheckCircle />}
          sx={{ mb: 4, borderRadius: 2 }}
        >
          <Typography variant="body2" fontWeight={600}>
            Discord Connected: {user.discordUsername || 'Linked'}
          </Typography>
        </Alert>
      )}

      {/* Cards */}
      <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'stretch' }}>

        {/* ── Free Card ───────────────────────────────────────────── */}
        <Paper variant="outlined" sx={cardSx}>
          <Typography variant="overline" color="text.secondary" fontWeight={700}>
            Free
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 1 }}>
            <Typography variant="h3" fontWeight={800}>$0</Typography>
            <Typography variant="body2" color="text.secondary">/forever</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Compare players, browse edges, get a free pick daily.
          </Typography>

          <Divider sx={{ mb: 2 }} />

          <List dense disablePadding sx={{ flex: 1 }}>
            {FREE_FEATURES.map((f) => (
              <ListItem key={f.text} disableGutters sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {f.included
                    ? <CheckCircle fontSize="small" color="success" />
                    : <RemoveCircleOutline fontSize="small" sx={{ color: 'text.disabled' }} />}
                </ListItemIcon>
                <ListItemText
                  primary={f.text}
                  primaryTypographyProps={{
                    variant: 'body2',
                    color: f.included ? 'text.primary' : 'text.disabled',
                  }}
                />
              </ListItem>
            ))}
          </List>

          <Button
            variant="outlined"
            fullWidth
            sx={{ mt: 3, borderRadius: 2, fontWeight: 700 }}
            onClick={() => navigate('/edge')}
          >
            Get Started
          </Button>
        </Paper>

        {/* ── VIP Pro Card ────────────────────────────────────────── */}
        <Paper
          variant="outlined"
          sx={{
            ...cardSx,
            border: `2px solid ${theme.palette.primary.main}`,
            position: 'relative',
          }}
        >
          <Chip
            label="Founder Pricing"
            color="primary"
            size="small"
            sx={{
              position: 'absolute',
              top: -12,
              right: 16,
              fontWeight: 700,
              fontSize: '0.7rem',
            }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BoltOutlined color="primary" />
            <Typography variant="overline" color="primary" fontWeight={700}>
              VIP Pro
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.5 }}>
            <Typography variant="h3" fontWeight={800}>$19</Typography>
            <Typography variant="body2" color="text.secondary">/month</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Or <strong>$199/year</strong>{' '}
            <Typography component="span" variant="body2" color="success.main" fontWeight={700}>
              (save 13%)
            </Typography>
          </Typography>

          <Divider sx={{ mb: 2 }} />

          <List dense disablePadding sx={{ flex: 1 }}>
            {VIP_FEATURES.map((f) => (
              <ListItem key={f.text} disableGutters sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckCircle fontSize="small" color="success" />
                </ListItemIcon>
                <ListItemText
                  primary={f.text}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            ))}
          </List>

          <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Button
              variant="contained"
              fullWidth
              {...(ref
                ? { onClick: () => { funnelEvent('vip-cta-click', { plan: 'monthly', ref }); startCheckout('monthly'); } }
                : { href: STRIPE_LINK_MONTHLY, rel: 'noopener noreferrer', onClick: () => funnelEvent('vip-cta-click', { plan: 'monthly' }) }
              )}
              disabled={checkoutLoading === 'monthly'}
              startIcon={<LockOpen />}
              sx={{ borderRadius: 2, fontWeight: 700, py: 1.2 }}
            >
              {checkoutLoading === 'monthly' ? 'Loading…' : 'Join VIP Pro — $19/mo'}
            </Button>
            <Button
              variant="outlined"
              fullWidth
              {...(ref
                ? { onClick: () => { funnelEvent('vip-cta-click', { plan: 'annual', ref }); startCheckout('annual'); } }
                : { href: STRIPE_LINK_ANNUAL, rel: 'noopener noreferrer', onClick: () => funnelEvent('vip-cta-click', { plan: 'annual' }) }
              )}
              disabled={checkoutLoading === 'annual'}
              sx={{ borderRadius: 2, fontWeight: 700, py: 1.2 }}
            >
              {checkoutLoading === 'annual' ? 'Loading…' : 'Join VIP Pro Annual — $199/yr'}
            </Button>
          </Box>

          {user?.vipActive && !user.discordConnected ? (
            <Button
              variant="outlined"
              fullWidth
              startIcon={<DiscordIcon size={16} />}
              onClick={() => {
                window.location.href = '/api/auth?_subpath=discord/start';
              }}
              sx={{
                mt: 2,
                borderRadius: 2,
                fontWeight: 700,
                borderColor: '#5865F2',
                color: '#5865F2',
                '&:hover': { bgcolor: 'rgba(88,101,242,0.08)', borderColor: '#4752C4' },
              }}
            >
              Connect Discord for VIP Role
            </Button>
          ) : user?.vipActive && user.discordConnected ? (
            <Typography variant="caption" sx={{ mt: 2, textAlign: 'center', lineHeight: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
              <CheckCircle fontSize="small" color="success" />
              Discord Connected: {user.discordUsername || 'Linked'}
            </Typography>
          ) : (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, textAlign: 'center', lineHeight: 1.5 }}>
              After purchase, sign in and connect Discord to automatically receive the VIP Pro role.
            </Typography>
          )}
        </Paper>
      </Box>

      {/* Website access note */}
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ display: 'block', textAlign: 'center', mt: 3, lineHeight: 1.6 }}
      >
        Want VIP access on the website without Discord? Sign in with the email you used for purchase.
      </Typography>

      {/* Disclaimer */}
      <Typography
        variant="caption"
        color="text.disabled"
        sx={{ display: 'block', textAlign: 'center', mt: 2, lineHeight: 1.6 }}
      >
        This tool provides statistical insights and tracking. It is not financial advice.
        Past results don't guarantee future performance. Payments processed securely via Stripe.
      </Typography>
    </Box>
  );
};

export default Pricing;
