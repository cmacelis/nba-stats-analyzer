import React from 'react';
import {
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
import { useNavigate } from 'react-router-dom';

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

const Pricing: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
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
              href={STRIPE_LINK_MONTHLY}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<LockOpen />}
              sx={{ borderRadius: 2, fontWeight: 700, py: 1.2 }}
            >
              Join VIP Pro — $19/mo
            </Button>
            <Button
              variant="outlined"
              fullWidth
              href={STRIPE_LINK_ANNUAL}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ borderRadius: 2, fontWeight: 700, py: 1.2 }}
            >
              Join VIP Pro Annual — $199/yr
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, textAlign: 'center', lineHeight: 1.5 }}>
            After purchase, DM <strong>@cmacelis</strong> on Discord with your receipt email + Discord username to receive the VIP Pro role.
          </Typography>
        </Paper>
      </Box>

      {/* Disclaimer */}
      <Typography
        variant="caption"
        color="text.disabled"
        sx={{ display: 'block', textAlign: 'center', mt: 4, lineHeight: 1.6 }}
      >
        This tool provides statistical insights and tracking. It is not financial advice.
        Past results don't guarantee future performance. Payments processed securely via Stripe.
      </Typography>
    </Box>
  );
};

export default Pricing;
