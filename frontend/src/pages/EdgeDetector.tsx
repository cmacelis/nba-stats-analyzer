import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import { AddCircleOutline, BoltOutlined, LockOutlined, Share as ShareIcon, SportsBasketball, TrendingDown, TrendingUp } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PlayerAvatar from '../components/PlayerAvatar';
import { useEdgeFeed, useTrackPick, EdgeEntry, type EdgeEmptyReason } from '../hooks/useNbaData';
import { useAuth } from '../contexts/AuthContext';

// ── constants ─────────────────────────────────────────────────────────────────

const FREE_LIMIT = 5; // free tier sees top N rows; rest are gated

const STAT_OPTIONS = [
  { value: 'pts', label: 'PTS (Points)' },
  { value: 'pra', label: 'PRA (Pts + Reb + Ast)' },
];

const SEASON_OPTIONS = [
  { value: 2025, label: '2025-26' },
  { value: 2024, label: '2024-25 (ended)' },
  { value: 2023, label: '2023-24 (ended)' },
  { value: 2022, label: '2022-23 (ended)' },
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
  entry:             EdgeEntry;
  stat:              string;
  season:            number;
  minMinutes:        number;
  initialDirection?: 'over' | 'under';
  onClose:           () => void;
  onNavigate:        () => void;
}

const TrackModal: React.FC<TrackModalProps> = ({ entry, stat, season, minMinutes, initialDirection, onClose, onNavigate }) => {
  const theme = useTheme();
  const trackPick = useTrackPick();

  const [pickStat,   setPickStat]   = useState<'pts' | 'reb' | 'ast' | 'pra'>(stat as 'pts' | 'pra');
  const [direction,  setDirection]  = useState<'over' | 'under'>(initialDirection ?? (entry.delta > 0 ? 'over' : 'under'));
  const [tier,       setTier]       = useState<'high' | 'medium' | 'low'>(autoTier(entry.delta));
  const [line,       setLine]       = useState(entry.prop_line ? String(entry.prop_line) : '');
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
            placeholder={entry.prop_line ? `${entry.prop_line} (${entry.line_source})` : entry.season_avg.toFixed(1)}
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
  onShare:    (e: React.MouseEvent) => void;
  rowRef?:    (el: HTMLTableRowElement | null) => void;
}> = ({ rank, entry, stat, onCompare, onTrack, onShare, rowRef }) => {
  const theme = useTheme();
  const isUp = entry.delta > 0;
  const statLabel = stat === 'pra' ? 'PRA' : 'PTS';

  return (
    <TableRow hover onClick={onCompare} ref={rowRef} sx={{ cursor: 'pointer' }}>
      <TableCell sx={{ color: 'text.disabled', fontWeight: 600, width: 36 }}>{rank}</TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PlayerAvatar name={entry.player_name} photoUrl={entry.photo_url ?? undefined} size={36} />
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.2 }}>{entry.player_name}</Typography>
              {entry.has_game_today && (
                <Chip size="small" label="LIVE" color="success"
                  sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700, '& .MuiChip-label': { px: 0.5 } }} />
              )}
            </Box>
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
        {entry.prop_line ? (
          <Tooltip title={`${entry.line_source} line`}>
            <Typography variant="body2" fontWeight={600} color="primary.main">{entry.prop_line}</Typography>
          </Tooltip>
        ) : (
          <Typography variant="body2" color="text.disabled">—</Typography>
        )}
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
      <TableCell align="center" sx={{ width: 80, pr: 0.5 }}>
        <Tooltip title="Share this edge">
          <IconButton size="small" onClick={onShare}>
            <ShareIcon fontSize="small" />
          </IconButton>
        </Tooltip>
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

// ── empty state ──────────────────────────────────────────────────────────────

const EmptyState: React.FC<{
  reason: EdgeEmptyReason;
  positiveOnly: boolean;
  minMinutes: number;
  season: number;
}> = ({ reason, positiveOnly, minMinutes, season }) => {
  if (reason === 'past_season') {
    const label = SEASON_OPTIONS.find(o => o.value === season)?.label ?? `${season}`;
    return (
      <Alert severity="info">
        The {label} season has ended — edge detection needs recent game data to compare against.
        Switch to the current season for live edges.
      </Alert>
    );
  }
  if (reason === 'upstream_error') {
    return (
      <Alert severity="warning">
        Stats data is temporarily unavailable upstream. Edges will return once the data source recovers — try again in a few minutes.
      </Alert>
    );
  }
  if (reason === 'filter_too_restrictive' || minMinutes > 35) {
    return (
      <Alert severity="info">
        No players averaged {minMinutes}+ minutes in their last 5 games. Try lowering minimum minutes to 20–30.
      </Alert>
    );
  }
  if (positiveOnly) {
    return (
      <Alert severity="info">
        No positive-delta edges right now. Disable the &quot;Positive Δ only&quot; toggle to see all edges.
      </Alert>
    );
  }
  // Generic fallback (no_qualifying_players or unknown)
  return (
    <Alert severity="info">
      No qualifying edges right now. Check back when more games are being played.
    </Alert>
  );
};

// ── page ──────────────────────────────────────────────────────────────────────

const EdgeDetector: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isVip = user?.vipActive === true;
  const authParam = searchParams.get('auth');

  // Read URL params set by Discord "Open Edge Feed" / "Track this pick" links
  const urlStat        = searchParams.get('stat')        as 'pts' | 'pra' | null;
  const urlSeason      = searchParams.get('s');
  const urlMinMinutes  = searchParams.get('min_minutes');
  const trackPlayerId  = searchParams.get('track_player_id');
  const trackStat      = searchParams.get('track_stat')  as 'pts' | 'pra' | null;
  const trackDirection = searchParams.get('track_direction') as 'over' | 'under' | null;

  // Read league from URL (?league=wnba) or default to 'nba'
  const urlLeague = searchParams.get('league') as 'nba' | 'wnba' | null;

  const [league,       setLeague]       = useState<'nba' | 'wnba'>(urlLeague ?? 'nba');
  const [stat,         setStat]         = useState<'pts' | 'pra'>(urlStat ?? 'pts');
  const [minMinutes,   setMinMinutes]   = useState(urlMinMinutes ? parseInt(urlMinMinutes, 10) : 20);
  const [season,       setSeason]       = useState(urlSeason ? parseInt(urlSeason, 10) : 2025);
  const [positiveOnly, setPositiveOnly] = useState(false);
  const [tracked,      setTracked]      = useState<EdgeEntry | null>(null);
  const [trackedInitialStat,      setTrackedInitialStat]      = useState<'pts' | 'pra' | undefined>();
  const [trackedInitialDirection, setTrackedInitialDirection] = useState<'over' | 'under' | undefined>();

  const [shareToast, setShareToast] = useState(false);
  const highlightId = searchParams.get('highlight');
  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());

  // Prevent double-open if data re-fetches while modal is already open
  const deepLinkHandled = useRef(false);
  const highlightHandled = useRef(false);

  const { data, isLoading, error } = useEdgeFeed(stat, minMinutes, season, league);

  // Auto-open TrackModal when arriving via Discord "Track this pick" deep link
  useEffect(() => {
    if (!trackPlayerId || !data?.data || deepLinkHandled.current) return;
    const pid = parseInt(trackPlayerId, 10);
    const entry = data.data.find(e => e.player_id === pid);
    if (!entry) return;
    deepLinkHandled.current = true;
    setTracked(entry);
    setTrackedInitialStat(trackStat ?? undefined);
    setTrackedInitialDirection(trackDirection ?? undefined);
    // Clean track_* params from URL so a refresh doesn't re-open the modal
    const clean = new URLSearchParams({ stat, s: String(season), min_minutes: String(minMinutes), league });
    navigate(`/edge?${clean.toString()}`, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, trackPlayerId]);

  // Scroll to and highlight a player row when arriving via a share link
  useEffect(() => {
    if (!highlightId || !data?.data || highlightHandled.current) return;
    const pid = parseInt(highlightId, 10);
    const el = rowRefs.current.get(pid);
    if (!el) return;
    highlightHandled.current = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.style.transition = 'background-color 0.3s';
    el.style.backgroundColor = 'rgba(25, 118, 210, 0.15)';
    setTimeout(() => { el.style.backgroundColor = ''; }, 2000);
  }, [data, highlightId]);

  function buildShareUrl(entry: EdgeEntry): string {
    const params = new URLSearchParams({
      card: '',
      p: String(entry.player_id),
      n: entry.player_name,
      t: entry.team_abbrev,
      s: stat,
      d: String(entry.delta),
      a: String(entry.season_avg),
      r: String(entry.recent_avg),
    });
    if (entry.prop_line != null) params.set('l', String(entry.prop_line));
    return `https://edgedetector.ai/api/edge?${params.toString()}`;
  }

  const handleShare = (entry: EdgeEntry, e: React.MouseEvent): void => {
    e.stopPropagation();
    navigator.clipboard.writeText(buildShareUrl(entry));
    setShareToast(true);
  };

  const rows = useMemo(() => {
    const entries = data?.data ?? [];
    return positiveOnly ? entries.filter(e => e.delta > 0) : entries;
  }, [data, positiveOnly]);

  const visibleLimit = isVip ? rows.length : FREE_LIMIT;
  const freeRows    = rows.slice(0, visibleLimit);
  const lockedCount = isVip ? 0 : Math.max(0, rows.length - FREE_LIMIT);

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
        Players ranked by edge — recent performance vs sportsbook lines (or season average).
        Click a row to compare; click <AddCircleOutline sx={{ fontSize: 14, verticalAlign: 'middle' }} /> to track a pick.
      </Typography>

      {/* Welcome banner after free signup */}
      {authParam === 'free-signup' && user && (
        <Alert
          severity="success"
          sx={{ mb: 3, borderRadius: 2 }}
          onClose={() => {
            const clean = new URLSearchParams(searchParams);
            clean.delete('auth');
            navigate(`/edge${clean.toString() ? `?${clean}` : ''}`, { replace: true });
          }}
        >
          <Typography variant="body2" fontWeight={600}>
            Welcome — your Free account is active! You're signed in as {user.email}.
          </Typography>
        </Alert>
      )}

      {/* Filters */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, alignItems: 'center' }}>
        <ToggleButtonGroup
          exclusive
          value={league}
          onChange={(_, v) => v && setLeague(v)}
          size="small"
        >
          <ToggleButton value="nba" sx={{ fontWeight: 700, px: 2 }}>
            <SportsBasketball sx={{ fontSize: 16, mr: 0.5 }} /> NBA
          </ToggleButton>
          <ToggleButton value="wnba" sx={{ fontWeight: 700, px: 2 }}>
            <SportsBasketball sx={{ fontSize: 16, mr: 0.5 }} /> WNBA
          </ToggleButton>
        </ToggleButtonGroup>

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
          onChange={e => setMinMinutes(Math.min(38, Math.max(0, parseInt(e.target.value) || 0)))}
          inputProps={{ min: 0, max: 38, step: 5 }} sx={{ width: 130 }}
          helperText={minMinutes > 30 ? 'High — fewer players qualify' : undefined}
          FormHelperTextProps={{ sx: { color: 'warning.main', mt: 0.25, fontSize: '0.65rem' } }}
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
        <Alert severity="error">Edge feed temporarily unavailable. Please try again in a few minutes.</Alert>
      ) : rows.length === 0 ? (
        <EmptyState reason={data?.reason ?? null} positiveOnly={positiveOnly} minMinutes={minMinutes} season={season} />
      ) : (
        <>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>#</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Player</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Season {statLabel}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>L5 {statLabel}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Line</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Δ</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Trend</TableCell>
                <TableCell sx={{ width: 80 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {freeRows.map((entry, i) => (
                <EdgeRow
                  key={entry.player_id}
                  rank={i + 1}
                  entry={entry}
                  stat={stat}
                  onCompare={() => handleCompare(entry)}
                  onTrack={e => { e.stopPropagation(); setTracked(entry); }}
                  onShare={e => handleShare(entry, e)}
                  rowRef={el => { if (el) rowRefs.current.set(entry.player_id, el); }}
                />
              ))}
              {/* Ghost locked rows — hinting at hidden content */}
              {lockedCount > 0 && [...Array(Math.min(6, lockedCount))].map((_, i) => (
                <TableRow key={`locked-${i}`} sx={{ filter: 'blur(4px)', opacity: 0.22, pointerEvents: 'none', userSelect: 'none' }}>
                  <TableCell sx={{ color: 'text.disabled', fontWeight: 600 }}>{FREE_LIMIT + i + 1}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ width: 36, height: 36, bgcolor: 'grey.500', borderRadius: '50%' }} />
                      <Box>
                        <Box sx={{ width: 90 + i * 15, height: 10, bgcolor: 'grey.500', borderRadius: 1, mb: 0.75 }} />
                        <Box sx={{ width: 55, height: 8, bgcolor: 'grey.400', borderRadius: 1 }} />
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="center"><Box sx={{ width: 30, height: 10, bgcolor: 'grey.500', borderRadius: 1, mx: 'auto' }} /></TableCell>
                  <TableCell align="center"><Box sx={{ width: 30, height: 10, bgcolor: 'grey.500', borderRadius: 1, mx: 'auto' }} /></TableCell>
                  <TableCell align="center"><Box sx={{ width: 30, height: 10, bgcolor: 'grey.400', borderRadius: 1, mx: 'auto' }} /></TableCell>
                  <TableCell align="center"><Box sx={{ width: 44, height: 22, bgcolor: 'grey.400', borderRadius: 3, mx: 'auto' }} /></TableCell>
                  <TableCell align="center"><Box sx={{ width: 50, height: 24, bgcolor: 'grey.400', borderRadius: 1, mx: 'auto' }} /></TableCell>
                  <TableCell />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Paywall gate */}
        {lockedCount > 0 && (
          <Box sx={{
            mt: 0.5, p: 3, textAlign: 'center', borderRadius: 2,
            border: '1px solid', borderColor: 'primary.main',
            bgcolor: 'background.paper',
          }}>
            <LockOutlined color="primary" sx={{ fontSize: 36, mb: 1 }} />
            <Typography variant="h6" fontWeight={700} gutterBottom>
              +{lockedCount} edges hidden
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, maxWidth: 360, mx: 'auto' }}>
              Unlock the full Edge Feed + VIP Discord alerts
            </Typography>
            <Button
              variant="contained"
              size="large"
              color="primary"
              onClick={() => navigate('/pricing')}
              sx={{ px: 4, fontWeight: 700, borderRadius: 2 }}
            >
              Join VIP Pro — $19/mo
            </Button>
          </Box>
        )}
        </>
      )}

      <Typography variant="caption" color="text.disabled" sx={{ mt: 3, display: 'block' }}>
        {league.toUpperCase()} · {STAT_OPTIONS.find(o => o.value === stat)?.label} · min {minMinutes} min/game · refreshes every 10 min
      </Typography>

      <Snackbar
        open={shareToast}
        autoHideDuration={2000}
        onClose={() => setShareToast(false)}
        message="Edge card link copied!"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      {/* Track modal */}
      {tracked && (
        <TrackModal
          entry={tracked}
          stat={trackedInitialStat ?? stat}
          season={season}
          minMinutes={minMinutes}
          initialDirection={trackedInitialDirection}
          onClose={() => { setTracked(null); setTrackedInitialStat(undefined); setTrackedInitialDirection(undefined); }}
          onNavigate={() => { setTracked(null); setTrackedInitialStat(undefined); setTrackedInitialDirection(undefined); handleCompare(tracked); }}
        />
      )}
    </Box>
  );
};

export default EdgeDetector;
