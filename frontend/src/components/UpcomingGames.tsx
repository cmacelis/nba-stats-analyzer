import React, { useState } from 'react';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Collapse,
  Grid,
  Skeleton,
  Typography,
} from '@mui/material';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import { NbaGame, useUpcomingGames } from '../hooks/useNbaData';
import { Player } from '../types/player';
import { searchPlayers } from '../services/playerService';

// ---------------------------------------------------------------------------
// Star player lookup — 2025-26 season (all 30 NBA teams)
// Users can always swap via the PlayerSearch dropdowns below
// ---------------------------------------------------------------------------
const TEAM_STAR_PLAYER: Record<string, string> = {
  ATL: 'Trae Young',
  BOS: 'Jayson Tatum',
  BKN: 'Cam Thomas',
  CHA: 'LaMelo Ball',
  CHI: 'Zach LaVine',
  CLE: 'Donovan Mitchell',
  DAL: 'Kyrie Irving',
  DEN: 'Nikola Jokic',
  DET: 'Cade Cunningham',
  GSW: 'Stephen Curry',
  HOU: 'Alperen Sengun',
  IND: 'Tyrese Haliburton',
  LAC: 'Kawhi Leonard',
  LAL: 'Luka Doncic',
  MEM: 'Ja Morant',
  MIA: 'Bam Adebayo',
  MIL: 'Giannis Antetokounmpo',
  MIN: 'Anthony Edwards',
  NOP: 'Zion Williamson',
  NYK: 'Jalen Brunson',
  OKC: 'Shai Gilgeous-Alexander',
  ORL: 'Paolo Banchero',
  PHI: 'Joel Embiid',
  PHX: 'Kevin Durant',
  POR: 'Scoot Henderson',
  SAC: "De'Aaron Fox",
  SAS: 'Victor Wembanyama',
  TOR: 'Scottie Barnes',
  UTA: 'Lauri Markkanen',
  WAS: 'Kyle Kuzma',
};

function formatGameDate(isoDate: string): string {
  // Date-only strings (e.g. "2026-02-22") are parsed as UTC midnight → show wrong day in US timezones.
  // Appending T12:00:00 keeps noon UTC which survives any UTC-offset conversion.
  const normalized = isoDate.includes('T') ? isoDate : `${isoDate}T12:00:00`;
  const d = new Date(normalized);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatStatus(status: string): string | null {
  // BDL returns ISO datetime strings for scheduled games (e.g. "2026-02-22T20:30:00Z")
  if (/^\d{4}-\d{2}-\d{2}T/.test(status)) {
    const d = new Date(status);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  }
  // In-progress ("2nd Qtr") or finished ("Final") — show as-is (Final is already filtered out)
  return status;
}

interface UpcomingGamesProps {
  onSelectGame: (player1: Player, player2: Player) => void;
}

const UpcomingGames: React.FC<UpcomingGamesProps> = ({ onSelectGame }) => {
  const { data: games, isLoading } = useUpcomingGames();
  const [expanded, setExpanded] = useState(false);
  const [loadingGameId, setLoadingGameId] = useState<number | null>(null);

  const handlePredict = async (game: NbaGame) => {
    const homeStar = TEAM_STAR_PLAYER[game.home_team.abbreviation];
    const awayStar = TEAM_STAR_PLAYER[game.visitor_team.abbreviation];
    if (!homeStar || !awayStar) return;

    setLoadingGameId(game.id);
    try {
      const [homeResults, awayResults] = await Promise.all([
        searchPlayers(homeStar),
        searchPlayers(awayStar),
      ]);
      if (homeResults[0] && awayResults[0]) {
        onSelectGame(homeResults[0], awayResults[0]);
      }
    } finally {
      setLoadingGameId(null);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>Upcoming Games</Typography>
        <Grid container spacing={1.5}>
          {[0, 1, 2].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rounded" height={72} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  // Hide entirely if no games (off-season, all-star break, API error)
  if (!games || games.length === 0) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, cursor: 'pointer' }}
        onClick={() => setExpanded((prev) => !prev)}
      >
        <Typography variant="h6">
          Upcoming Games ({games.length})
        </Typography>
        {expanded ? <ExpandLess /> : <ExpandMore />}
      </Box>

      <Collapse in={expanded}>
        <Grid container spacing={1.5}>
          {games.map((game) => {
            const hasMappedPlayers =
              game.home_team.abbreviation in TEAM_STAR_PLAYER &&
              game.visitor_team.abbreviation in TEAM_STAR_PLAYER;
            const isThisLoading = loadingGameId === game.id;
            const isDisabled = !hasMappedPlayers || loadingGameId !== null;

            return (
              <Grid item xs={12} sm={6} md={4} key={game.id}>
                <Card
                  variant="outlined"
                  sx={{
                    height: '100%',
                    opacity: isDisabled && !isThisLoading ? 0.5 : 1,
                  }}
                >
                  <CardActionArea
                    disabled={isDisabled}
                    onClick={() => handlePredict(game)}
                    sx={{ height: '100%' }}
                  >
                    <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="body2" fontWeight="bold" sx={{ lineHeight: 1.3 }}>
                            {game.visitor_team.abbreviation}{' '}
                            <Typography component="span" color="text.secondary" variant="body2">@</Typography>{' '}
                            {game.home_team.abbreviation}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                            {formatGameDate(game.date)}
                            {(() => { const s = formatStatus(game.status); return s ? <> &middot; {s}</> : null; })()}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {isThisLoading ? (
                            <CircularProgress size={16} color="secondary" />
                          ) : (
                            <Typography
                              variant="caption"
                              color="secondary"
                              sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}
                            >
                              Predict →
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Collapse>
    </Box>
  );
};

export default UpcomingGames;
