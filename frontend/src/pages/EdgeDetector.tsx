import React, { useState, useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { AddCircleOutline, BoltOutlined, TrendingDown, TrendingUp } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PlayerAvatar from '../components/PlayerAvatar';
import { useEdgeFeed, useTrackPick, EdgeEntry } from '../hooks/useNbaData';

// ── constants ─────────────────────────────────────────────────────────────────

const STAT_OPTIONS = [
  { value: 'pts', label: 'PTS (Points)' },
  { value: 'pra', label: 'PRA (Pts + Reb + Ast)' },
];

const SEASON_OPTIONS = [
  { value: 2025, label: '2025-26' },
  { value: 2024, label: '2024-25' },
  { value: 2023, label: '2023-24' },
  { value: 2022, label: '2022-23' },
];

const MARKET_OPTIONS = [
  { value: 'pts', label: 'Points' },
  { value: 'reb', label: 'Rebounds' },
  { value: 'ast', label: 'Assists' },
  { value: 'pra', label: 'PRA' },
];

function sign(n: number): string {
  return n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1);
}

function autoTier(delta: number): 'high' | 'medium' | 'low' {
  const abs = Math.abs(delta);
  if (abs >= 5) return 'high';
  if (abs >= 2) return 'medium';
  return 'low';
}

// ── mini sparkline ────────────────────────────────────────────────────────────

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

// ── track modal ───────────────────────────────────────────────────────────────

interface TrackModalProps {
  entry:       EdgeEntry;
  stat:        string;
  season:      number;
  minMinutes:  number;
  onClose:     () => void;
  onNavigate:  () => void;
}

const TrackModal: React.FC<TrackModalProps> = ({ entry, stat, season, minMinutes, onClose, onNavigate }) => {
  const theme = useTheme();
  const trackPick = useTrackPick();

  const [pickStat,   setPickStat]   = useState<'pts' | 'reb' | 'ast' | 'pra'>(stat as 'pts' | 'pra');
  const [direction,  setDirection]  = useState<'over' | 'under'>(entry.delta > 0 ? 'over' : 'under');
  const [tier,       setTier]       = useState<'high' | 'medium' | 'low'>(autoTier(entry.delta));
  const [line,       setLine]       = useState('');
  const [notes,      setNotes]      = useState('');
  const [toast,      setToast]      = useState<string | null>(null);

  const isUp  = entry.delta > 0;
  const isBet = line.trim() !== '' && !isNaN(parseFloat(line));

  const handleSubmit = async () => {
    const result = await trackPick.mutateAsync({
      player_id:       entry.player_id,
      player_name:     entry.player_name,
      team:            entry.team,
      stat:            pickStat,
      season_used:     season,
      season_avg:      entry.season_avg,
      l5_avg:          entry.recent_avg,
      delta:           entry.delta,
      min_minutes:     minMinutes,
      direction,
      confidence_tier: tier,
      ...(isBet          && { line:  parseFloat(line)  }),
      ...(notes.trim()   && { notes: notes.trim()      }),
    } as never);

    const label = isBet ? 'Bet' : 'Signal';
    if (result.configured === false) {
      setToast(`Tracked (${label}) — set up Vercel KV for cross-device sync.`);
    } else {
      setToast(`Tracked (${label})`);
    }
    setTimeout(onClose, 1400);
  };

  return (
    <>
      <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PlayerAvatar name={entry.player_name} photoUrl={entry.photo_url ?? undefined} size={40} />
            <Box>
              <Typography fontWeight={700}>{entry.player_name}</Typography>
              <Typography variant="caption" color="text.secondary">{entry.team}</Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          {/* Stat context */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">Season avg</Typography>
              <Typography fontWeight={600}>{entry.season_avg.toFixed(1)}</Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">L5 avg</Typography>
              <Typography fontWeight={600}>{entry.recent_avg.toFixed(1)}</Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">Δ</Typography>
              <Typography fontWeight={700}
                color={isUp ? theme.palette.success.main : theme.palette.error.main}>
                {sign(entry.delta)}
              </Typography>
            </Box>
          </Box>

          {/* Stat */}
          <FormControl size="small" fullWidth sx={{ mb: 2 }}>
            <InputLabel>Stat</InputLabel>
            <Select value={pickStat} label="Stat"
              onChange={e => setPickStat(e.target.value as typeof pickStat)}>
              {MARKET_OPTIONS.map(o => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Direction */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Direction</Typography>
          <ToggleButtonGroup
            exclusive
            value={direction}
            onChange={(_, v) => v && setDirection(v)}
            size="small"
            fullWidth
            sx={{ mb: 2 }}
          >
            <ToggleButton value="over"
              sx={{ fontWeight: 700, color: direction === 'over' ? 'success.main' : undefined }}>
              Over ↑
            </ToggleButton>
            <ToggleButton value="under"
              sx={{ fontWeight: 700, color: direction === 'under' ? 'error.main' : undefined }}>
              Under ↓
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Confidence */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Confidence</Typography>
          <ToggleButtonGroup
            exclusive
            value={tier}
            onChange={(_, v) => v && setTier(v)}
            size="small"
            fullWidth
            sx={{ mb: 2 }}
          >
            <ToggleButton value="low">Low</ToggleButton>
            <ToggleButton value="medium">Medium</ToggleButton>
            <ToggleButton value="high">High</ToggleButton>
          </ToggleButtonGroup>

          {/* Optional line */}
          <TextField
            size="small"
            label="Sportsbook line (optional — makes this a Bet)"
            type="number"
            value={line}
            onChange={e => setLine(e.target.value)}
            placeholder={entry.season_avg.toFixed(1)}
            InputProps={{
              startAdornment: <InputAdornment position="start">O/U</InputAdornment>,
              endAdornment: line.trim() ? (
                <InputAdornment position="end">
                  <Chip label="Bet" size="small" color="secondary" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
                </InputAdornment>
              ) : (
                <InputAdornment position="end">
                  <Chip label="Signal" size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
                </InputAdornment>
              ),
            }}
            fullWidth
            sx={{ mb: 1.5 }}
          />

          {/* Optional notes */}
          <TextField
            size="small"
            label="Rationale / notes (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            multiline
            minRows={2}
            inputProps={{ maxLength: 280 }}
            placeholder="e.g. Hot streak, favourable matchup vs poor perimeter D"
            fullWidth
            helperText={notes.length > 0 ? `${notes.length}/280` : undefined}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" size="small" onClick={onNavigate}>
            Compare Players
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleSubmit}
            disabled={trackPick.isPending}
            startIcon={trackPick.isPending ? <CircularProgress size={14} /> : <AddCircleOutline />}
          >
            Track {isBet ? 'Bet' : 'Signal'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
};

// ── row ───────────────────────────────────────────────────────────────────────

const EdgeRow: React.FC<{
  rank:       number;
  entry:      EdgeEntry;
  stat:       string;
  onCompare:  () => void;
  onTrack:    (e: React.MouseEvent) => void;
}> = ({ rank, entry, stat, onCompare, onTrack }) => {
  const theme = useTheme();
  const isUp = entry.delta > 0;
  const statLabel = stat === 'pra' ? 'PRA' : 'PTS';

  return (
    <TableRow hover onClick={onCompare} sx={{ cursor: 'pointer' }}>
      <TableCell sx={{ color: 'text.disabled', fontWeight: 600, width: 36 }}>{rank}</TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PlayerAvatar name={entry.player_name} photoUrl={entry.photo_url ?? undefined} size={36} />
          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.2 }}>{entry.player_name}</Typography>
            <Typography variant="caption" color="text.secondary">{entry.team_abbrev} · {entry.games_played}G</Typography>
          </Box>
        </Box>
      </TableCell>
      <TableCell align="center" sx={{ color: 'text.secondary' }}>
        <Tooltip title={`Season avg ${statLabel}`}><span>{entry.season_avg.toFixed(1)}</span></Tooltip>
      </TableCell>
      <TableCell align="center" sx={{ fontWeight: 600 }}>
        <Tooltip title={`Last 5 avg ${statLabel}`}><span>{entry.recent_avg.toFixed(1)}</span></Tooltip>
      </TableCell>
      <TableCell align="center">
        <Chip size="small"
          icon={isUp ? <TrendingUp /> : <TrendingDown />}
          label={sign(entry.delta)}
          sx={{
            fontWeight: 700,
            bgcolor: isUp ? theme.palette.success.light : theme.palette.error.light,
            color:   isUp ? theme.palette.success.dark  : theme.palette.error.dark,
            border: 'none',
          }}
        />
      </TableCell>
      <TableCell align="center" sx={{ minWidth: 72 }}>
        <Tooltip title={`Last 5: ${entry.last5.join(' → ')}`}>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Sparkline values={entry.last5} seasonAvg={entry.season_avg} />
          </Box>
        </Tooltip>
      </TableCell>
      <TableCell align="center" sx={{ width: 44, pr: 0.5 }}>
        <Tooltip title="Track this pick">
          <IconButton
            size="small"
            color="primary"
            onClick={onTrack}
            sx={{ '&:hover': { bgcolor: 'primary.light', color: 'primary.contrastText' } }}
          >
            <AddCircleOutline fontSize="small" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
};

// ── page ──────────────────────────────────────────────────────────────────────

const EdgeDetector: React.FC = () => {
  const navigate = useNavigate();

  const [stat,         setStat]         = useState<'pts' | 'pra'>('pts');
  const [minMinutes,   setMinMinutes]   = useState(20);
  const [season,       setSeason]       = useState(2025);
  const [positiveOnly, setPositiveOnly] = useState(false);
  const [tracked,      setTracked]      = useState<EdgeEntry | null>(null);

  const { data, isLoading, error } = useEdgeFeed(stat, minMinutes, season);

  const rows = useMemo(() => {
    const entries = data?.data ?? [];
    return positiveOnly ? entries.filter(e => e.delta > 0) : entries;
  }, [data, positiveOnly]);

  const handleCompare = (entry: EdgeEntry) => {
    const params = new URLSearchParams({
      p1:  String(entry.player_id),
      p1n: entry.player_name,
      p1t: entry.team,
      s:   String(season),
    });
    navigate(`/compare?${params.toString()}`);
  };

  const statLabel = stat === 'pra' ? 'PRA' : 'PTS';
  const generatedAt = data?.generated_at ? new Date(data.generated_at).toLocaleTimeString() : null;

  return (
    <Box sx={{ p: 3, maxWidth: 980, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <BoltOutlined color="primary" />
        <Typography variant="h4" fontWeight={700}>Edge Feed</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Players ranked by momentum discrepancy — season average vs last 5 games.
        Click a row to compare; click <AddCircleOutline sx={{ fontSize: 14, verticalAlign: 'middle' }} /> to track a pick.
      </Typography>

      {/* Filters */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Stat</InputLabel>
          <Select value={stat} label="Stat" onChange={e => setStat(e.target.value as 'pts' | 'pra')}>
            {STAT_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Season</InputLabel>
          <Select value={season} label="Season" onChange={e => setSeason(e.target.value as number)}>
            {SEASON_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </Select>
        </FormControl>

        <TextField
          size="small" label="Min minutes" type="number" value={minMinutes}
          onChange={e => setMinMinutes(Math.max(0, parseInt(e.target.value) || 0))}
          inputProps={{ min: 0, max: 48, step: 5 }} sx={{ width: 130 }}
        />

        <FormControlLabel
          control={<Switch checked={positiveOnly} onChange={e => setPositiveOnly(e.target.checked)} size="small" />}
          label={
            <Typography variant="body2">
              Positive Δ only{' '}
              <Typography component="span" variant="caption" color="text.secondary">(overs)</Typography>
            </Typography>
          }
        />

        {generatedAt && (
          <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto' }}>
            Updated {generatedAt}
          </Typography>
        )}
      </Box>

      {/* Table */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, my: 8 }}>
          <CircularProgress size={28} />
          <Typography color="text.secondary">Building edge feed…</Typography>
        </Box>
      ) : error ? (
        <Alert severity="error">Failed to load edge feed. Please try again.</Alert>
      ) : rows.length === 0 ? (
        <Alert severity="info">
          No players matched filters. Try lowering minimum minutes or disabling positive-only.
        </Alert>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>#</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Player</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Season {statLabel}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>L5 {statLabel}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Δ</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Trend</TableCell>
                <TableCell sx={{ width: 44 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((entry, i) => (
                <EdgeRow
                  key={entry.player_id}
                  rank={i + 1}
                  entry={entry}
                  stat={stat}
                  onCompare={() => handleCompare(entry)}
                  onTrack={e => { e.stopPropagation(); setTracked(entry); }}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Typography variant="caption" color="text.disabled" sx={{ mt: 3, display: 'block' }}>
        {STAT_OPTIONS.find(o => o.value === stat)?.label} · min {minMinutes} min/game · via BallDontLie · refreshes every 10 min
      </Typography>

      {/* Track modal */}
      {tracked && (
        <TrackModal
          entry={tracked}
          stat={stat}
          season={season}
          minMinutes={minMinutes}
          onClose={() => setTracked(null)}
          onNavigate={() => { setTracked(null); handleCompare(tracked); }}
        />
      )}
    </Box>
  );
};

export default EdgeDetector;
