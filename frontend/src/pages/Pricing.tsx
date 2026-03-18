import React from 'react';
import {
  Box,
  Button,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material';
import { BoltOutlined, CheckCircle, NotificationsActive, LockOpen } from '@mui/icons-material';

// ── TODO: paste your Stripe Payment Link here ──────────────────────────────────
const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/REPLACE_WITH_REAL_LINK';
// ─────────────────────────────────────────────────────────────────────────────

const WHAT_YOU_GET = [
  {
    icon: <NotificationsActive color="primary" />,
    primary: 'VIP Discord Alerts (#vip-alerts)',
    secondary: 'Real-time over/under signals posted to a private channel — triggered when a player\'s L5 avg diverges meaningfully from their season avg.',
  },
  {
    icon: <BoltOutlined color="primary" />,
    primary: 'Full Edge Feed — Top 20+ edges with filters',
    secondary: 'PTS and PRA sorted by Δ, filterable by minutes, stat, and season. Free tier is capped at 5.',
  },
  {
    icon: <CheckCircle color="success" />,
    primary: 'Track Bets & Signals + nightly settlement',
    secondary: 'Log picks before games, add a sportsbook line to upgrade a signal to a bet. Settlement runs nightly and computes W/L/P automatically.',
  },
  {
    icon: <CheckCircle color="success" />,
    primary: 'Results dashboard + /results command',
    secondary: 'See your 7-day and 30-day record (W-L-P, hit rate) on the web and on Discord with /results.',
  },
];

const HOW_IT_WORKS = [
  'Click "Join VIP Pro" and complete checkout via Stripe.',
  'We receive your confirmation and invite you to the private Discord server.',
  'VIP role is assigned within 24 hours — you\'ll see #vip-alerts and the full Edge Feed immediately.',
];

const Pricing: React.FC = () => {
  return (
    <Box sx={{ p: 3, maxWidth: 640, mx: 'auto' }}>

      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mb: 1 }}>
          <BoltOutlined color="primary" sx={{ fontSize: 36 }} />
          <Typography variant="h3" fontWeight={800}>VIP Pro</Typography>
        </Box>
        <Typography variant="h6" color="text.secondary" fontWeight={400}>
          Automated VIP Discord alerts + full Edge Feed + tracking &amp; results
        </Typography>
      </Box>

      {/* What you get */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography variant="overline" color="primary" fontWeight={700} sx={{ mb: 2, display: 'block' }}>
          What you get
        </Typography>
        <List disablePadding>
          {WHAT_YOU_GET.map((item, i) => (
            <React.Fragment key={item.primary}>
              <ListItem disableGutters alignItems="flex-start" sx={{ py: 1.5 }}>
                <ListItemIcon sx={{ mt: 0.25, minWidth: 36 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.primary}
                  secondary={item.secondary}
                  primaryTypographyProps={{ fontWeight: 700, variant: 'body1' }}
                  secondaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                />
              </ListItem>
              {i < WHAT_YOU_GET.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
      </Paper>

      {/* How it works */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography variant="overline" color="primary" fontWeight={700} sx={{ mb: 2, display: 'block' }}>
          How it works
        </Typography>
        <Stepper orientation="vertical" nonLinear sx={{ ml: -1 }}>
          {HOW_IT_WORKS.map((step, i) => (
            <Step key={i} active>
              <StepLabel>
                <Typography variant="body2" fontWeight={600}>Step {i + 1}</Typography>
              </StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary">{step}</Typography>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* CTA */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Button
          variant="contained"
          size="large"
          href={STRIPE_PAYMENT_LINK}
          target="_blank"
          rel="noopener noreferrer"
          startIcon={<LockOpen />}
          sx={{ px: 5, py: 1.5, fontWeight: 800, fontSize: '1.05rem', borderRadius: 3 }}
        >
          Join VIP Pro
        </Button>
      </Box>

      {/* Disclaimer */}
      <Typography
        variant="caption"
        color="text.disabled"
        sx={{ display: 'block', textAlign: 'center', lineHeight: 1.6 }}
      >
        This tool provides statistical insights and tracking. It is not financial advice.
        Past results don't guarantee future performance.
        Payments processed securely via Stripe.
      </Typography>

    </Box>
  );
};

export default Pricing;
