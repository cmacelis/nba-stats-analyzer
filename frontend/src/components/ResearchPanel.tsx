import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Divider,
  Stack,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  SelectChangeEvent,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Remove,
  Refresh,
  AutoAwesome,
  Search,
  ShowChart,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import researchApi, { PropType, ResearchReport, StatContext } from '../api/research';

// ── Sub-components ────────────────────────────────────────────────────────────

function PredictionBadge({ prediction }: { prediction: ResearchReport['prediction'] }) {
  if (prediction === 'over') {
    return (
      <Chip
        icon={<TrendingUp />}
        label="OVER"
        color="success"
        sx={{ fontWeight: 700, fontSize: '0.85rem', px: 0.5 }}
      />
    );
  }
  if (prediction === 'under') {
    return (
      <Chip
        icon={<TrendingDown />}
        label="UNDER"
        color="error"
        sx={{ fontWeight: 700, fontSize: '0.85rem', px: 0.5 }}
      />
    );
  }
  return (
    <Chip
      icon={<Remove />}
      label="NEUTRAL"
      color="default"
      sx={{ fontWeight: 700, fontSize: '0.85rem', px: 0.5 }}
    />
  );
}

function ConfidenceMeter({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  // >60% green, 50-60% yellow, <50% red
  const color: 'success' | 'warning' | 'error' =
    pct >= 60 ? 'success' : pct >= 50 ? 'warning' : 'error';
  const textColor = pct >= 60 ? 'success.main' : pct >= 50 ? 'warning.main' : 'error.main';
  const label = pct >= 60 ? 'High' : pct >= 50 ? 'Moderate' : 'Low';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          Confidence
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="caption" color={textColor} fontWeight={700}>
            {label}
          </Typography>
          <Typography variant="body2" fontWeight={800} color={textColor}>
            {pct}%
          </Typography>
        </Box>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        color={color}
        sx={{ height: 7, borderRadius: 4 }}
      />
    </Box>
  );
}

function StatContextRow({ ctx, propType }: { ctx: StatContext; propType: PropType }) {
  const delta5 = ctx.recentAvg5 - ctx.propLine;
  const hitPct = Math.round(ctx.overHitRate * 100);
  const consistencyLabel =
    ctx.stdDev < 3 ? 'Very consistent' :
    ctx.stdDev < 5 ? 'Consistent' :
    ctx.stdDev < 7 ? 'Moderate variance' : 'High variance';

  const streakLabel =
    ctx.streak > 0 ? `${ctx.streak} OVER streak` :
    ctx.streak < 0 ? `${Math.abs(ctx.streak)} UNDER streak` : 'No streak';

  const propUnit = propType === 'points' ? 'pts' : propType === 'rebounds' ? 'reb' : propType === 'assists' ? 'ast' : '';

  // Mini sparkline: last 10 games as colored dots
  const sparkDots = ctx.recentGames.slice(0, 10).map((v, i) => {
    const diff = v - ctx.propLine;
    const isOver  = diff >  0.5;
    const isUnder = diff < -0.5;
    return (
      <Tooltip key={i} title={`${v} ${propUnit} (${isOver ? '+' : ''}${diff.toFixed(1)} vs line)`} arrow>
        <Box
          sx={{
            width: 9, height: 9, borderRadius: '50%', cursor: 'default',
            bgcolor: isOver ? 'success.main' : isUnder ? 'error.main' : 'text.disabled',
            flexShrink: 0,
          }}
        />
      </Tooltip>
    );
  });

  return (
    <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        <ShowChart sx={{ fontSize: 14, color: 'text.secondary' }} />
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          STAT CONTEXT
        </Typography>
      </Box>

      {/* Key metrics row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, mb: 1.5 }}>
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">Line</Typography>
          <Typography variant="body2" fontWeight={700}>{ctx.propLine}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">L5 avg</Typography>
          <Typography
            variant="body2"
            fontWeight={700}
            color={delta5 > 1 ? 'success.main' : delta5 < -1 ? 'error.main' : 'text.primary'}
          >
            {ctx.recentAvg5}
            <Typography component="span" variant="caption" color="inherit" sx={{ ml: 0.3 }}>
              ({delta5 >= 0 ? '+' : ''}{delta5.toFixed(1)})
            </Typography>
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">Hit rate</Typography>
          <Typography
            variant="body2"
            fontWeight={700}
            color={hitPct >= 60 ? 'success.main' : hitPct <= 40 ? 'error.main' : 'text.primary'}
          >
            {hitPct}% over
          </Typography>
        </Box>
      </Box>

      {/* σ and streak */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          Variance: <strong>{ctx.stdDev} σ</strong> — {consistencyLabel}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {streakLabel}
        </Typography>
      </Box>

      {/* Sparkline dots */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
          L10:
        </Typography>
        {sparkDots}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: 'success.main' }} />
          <Typography variant="caption" color="text.secondary">over</Typography>
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: 'error.main', ml: 0.5 }} />
          <Typography variant="caption" color="text.secondary">under</Typography>
        </Box>
      </Box>
    </Box>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  playerName: string | null;
}

export default function ResearchPanel({ playerName }: Props) {
  const queryClient = useQueryClient();
  const [prop, setProp] = useState<PropType>('points');
  const [refreshKey, setRefreshKey] = useState(0);

  // Standalone search (used when no playerName prop)
  const [searchInput, setSearchInput] = useState('');
  const [localName, setLocalName] = useState<string | null>(null);

  const effectiveName = playerName ?? localName;

  const { data, isLoading, isError } = useQuery<ResearchReport>({
    queryKey: ['research', effectiveName, prop, refreshKey],
    queryFn: () => researchApi.getReport(effectiveName!, prop, refreshKey > 0),
    enabled: !!effectiveName,
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });

  const handleRefresh = () => {
    // Increment refreshKey → new queryKey → forces a fresh API call with refresh=true
    setRefreshKey(k => k + 1);
    // Also invalidate the old key so old data is cleared
    queryClient.removeQueries({ queryKey: ['research', effectiveName, prop] });
  };

  const handleSearch = () => {
    const trimmed = searchInput.trim();
    if (!trimmed) return;
    setLocalName(trimmed);
    setRefreshKey(0);
  };

  const handlePropChange = (e: SelectChangeEvent) => {
    setProp(e.target.value as PropType);
    setRefreshKey(0);
  };

  // ── Empty state ──────────────────────────────────────────────────────────

  if (!effectiveName) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AutoAwesome fontSize="small" color="primary" />
            <Typography variant="subtitle1" fontWeight={700}>
              Edge Signal
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              placeholder="Search player name…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Button variant="contained" size="small" onClick={handleSearch} sx={{ whiteSpace: 'nowrap' }}>
              Go
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Or select a player above to see edge signals
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // ── Loaded state ──────────────────────────────────────────────────────────

  return (
    <Card variant="outlined">
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <AutoAwesome fontSize="small" color="primary" />
          <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1, minWidth: 0 }}>
            Edge Signal —{' '}
            <Typography component="span" variant="subtitle1" fontWeight={400} noWrap>
              {effectiveName}
            </Typography>
          </Typography>
          {data?.simulated && (
            <Chip label="Simulated" size="small" variant="outlined" color="warning" />
          )}
          {data?.cached && <Chip label="Cached" size="small" variant="outlined" />}
          <Tooltip title="Force-refresh predictions">
            <span>
              <IconButton size="small" onClick={handleRefresh} disabled={isLoading}>
                <Refresh fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {/* Standalone search bar (shown when no playerName prop) */}
        {playerName === null && (
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              size="small"
              placeholder="Search another player…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Button variant="outlined" size="small" onClick={handleSearch}>
              Go
            </Button>
          </Box>
        )}

        {/* Prop selector */}
        <FormControl size="small" sx={{ mb: 2, minWidth: 140 }}>
          <InputLabel>Prop</InputLabel>
          <Select value={prop} label="Prop" onChange={handlePropChange}>
            <MenuItem value="points">Points</MenuItem>
            <MenuItem value="rebounds">Rebounds</MenuItem>
            <MenuItem value="assists">Assists</MenuItem>
            <MenuItem value="combined">Combined</MenuItem>
          </Select>
        </FormControl>

        {isLoading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 1 }}>
            <CircularProgress size={28} />
            <Typography variant="caption" color="text.secondary">
              Fetching game logs + running AI analysis…
            </Typography>
          </Box>
        )}

        {isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load research. Try refreshing.
          </Alert>
        )}

        {data && !isLoading && (
          <Stack spacing={2}>
            {/* Prediction + confidence */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PredictionBadge prediction={data.prediction} />
              {data.statContext && (
                <Typography variant="body2" color="text.secondary">
                  Line: <strong>{data.statContext.propLine}</strong>
                </Typography>
              )}
            </Box>

            <ConfidenceMeter confidence={data.confidence} />

            {/* Stat context block */}
            {data.statContext && (
              <StatContextRow ctx={data.statContext} propType={data.propType} />
            )}

            <Divider />

            {/* Reasoning */}
            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                Reasoning
              </Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                {data.reasoning}
              </Typography>
            </Box>

            {/* Key factors */}
            {(data.keyFactors?.length ?? 0) > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                  Key Factors
                </Typography>
                <Stack spacing={0.5}>
                  {data.keyFactors!.map((factor, i) => (
                    <Typography
                      key={i}
                      variant="body2"
                      sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}
                    >
                      <span style={{ color: '#888' }}>•</span> {factor}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}

            <Divider />

            {/* Footer: weights + timestamp */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box flex={1}>
                <Typography variant="caption" color="text.secondary">
                  Sentiment
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {data.sentimentWeight}
                </Typography>
              </Box>
              <Box flex={1}>
                <Typography variant="caption" color="text.secondary">
                  Stats
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {data.statWeight}
                </Typography>
              </Box>
            </Box>

            <Typography variant="caption" color="text.secondary">
              Generated {new Date(data.generatedAt).toLocaleString()}
            </Typography>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
