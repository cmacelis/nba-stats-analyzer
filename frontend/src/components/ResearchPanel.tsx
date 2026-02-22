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
  SelectChangeEvent,
} from '@mui/material';
import { TrendingUp, TrendingDown, Remove, Refresh, AutoAwesome } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import researchApi, { PropType, ResearchReport } from '../api/research';

interface Props {
  playerName: string | null;
}

function PredictionBadge({ prediction }: { prediction: ResearchReport['prediction'] }) {
  if (prediction === 'over') {
    return (
      <Chip
        icon={<TrendingUp />}
        label="OVER"
        color="success"
        size="small"
        sx={{ fontWeight: 700 }}
      />
    );
  }
  if (prediction === 'under') {
    return (
      <Chip
        icon={<TrendingDown />}
        label="UNDER"
        color="error"
        size="small"
        sx={{ fontWeight: 700 }}
      />
    );
  }
  return (
    <Chip
      icon={<Remove />}
      label="NEUTRAL"
      color="default"
      size="small"
      sx={{ fontWeight: 700 }}
    />
  );
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color: 'success' | 'warning' | 'error' =
    pct >= 70 ? 'success' : pct >= 50 ? 'warning' : 'error';
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          Confidence
        </Typography>
        <Typography variant="caption" fontWeight={700}>
          {pct}%
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        color={color}
        sx={{ height: 6, borderRadius: 3 }}
      />
    </Box>
  );
}

export default function ResearchPanel({ playerName }: Props) {
  const [prop, setProp] = useState<PropType>('points');
  const [forceRefresh, setForceRefresh] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery<ResearchReport>({
    queryKey: ['research', playerName, prop],
    queryFn: () => researchApi.getReport(playerName!, prop, forceRefresh),
    enabled: !!playerName,
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });

  const handleRefresh = () => {
    setForceRefresh(true);
    refetch().finally(() => setForceRefresh(false));
  };

  if (!playerName) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
            Select a player to view AI research
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <AutoAwesome fontSize="small" color="primary" />
          <Typography variant="subtitle1" fontWeight={700}>
            AI Research
          </Typography>
          {data?.simulated && (
            <Chip label="Simulated" size="small" variant="outlined" color="warning" />
          )}
          {data?.cached && <Chip label="Cached" size="small" variant="outlined" />}
          <Box sx={{ ml: 'auto' }}>
            <Button
              size="small"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              disabled={isLoading}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Prop selector */}
        <FormControl size="small" sx={{ mb: 2, minWidth: 140 }}>
          <InputLabel>Prop</InputLabel>
          <Select
            value={prop}
            label="Prop"
            onChange={(e: SelectChangeEvent) => setProp(e.target.value as PropType)}
          >
            <MenuItem value="points">Points</MenuItem>
            <MenuItem value="rebounds">Rebounds</MenuItem>
            <MenuItem value="assists">Assists</MenuItem>
            <MenuItem value="combined">Combined</MenuItem>
          </Select>
        </FormControl>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
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
            </Box>
            <ConfidenceBar confidence={data.confidence} />

            <Divider />

            {/* Reasoning */}
            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                Reasoning
              </Typography>
              <Typography variant="body2">{data.reasoning}</Typography>
            </Box>

            {/* Key factors */}
            {data.keyFactors.length > 0 && (
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  gutterBottom
                  display="block"
                >
                  Key Factors
                </Typography>
                <Stack spacing={0.5}>
                  {data.keyFactors.map((factor, i) => (
                    <Typography
                      key={i}
                      variant="body2"
                      sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}
                    >
                      <span>•</span> {factor}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}

            <Divider />

            {/* Weights */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box flex={1}>
                <Typography variant="caption" color="text.secondary">
                  Sentiment Weight
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {data.sentimentWeight}
                </Typography>
              </Box>
              <Box flex={1}>
                <Typography variant="caption" color="text.secondary">
                  Stats Weight
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {data.statWeight}
                </Typography>
              </Box>
            </Box>

            <Typography variant="caption" color="text.secondary">
              Generated {new Date(data.generatedAt).toLocaleString()} · Expires{' '}
              {new Date(data.expiresAt).toLocaleString()}
            </Typography>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
