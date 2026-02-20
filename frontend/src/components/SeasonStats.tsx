import React from 'react';
import { Box, Paper, Typography, Tabs, Tab, useTheme, Tooltip, IconButton, Skeleton, Alert, Divider, Grid, List, ListItem, ListItemText, ToggleButtonGroup, ToggleButton, Pagination, Menu, MenuItem, ListItemIcon, Fade } from '@mui/material';
import { Line } from 'react-chartjs-2';
import { Player } from '../types/player';
import { mockPlayerHistory } from '../services/mockData';
import { AnimatedElement } from './common/AnimatedElement';
import { Info, Refresh, EmojiEvents, CompareArrows, Sort, ArrowUpward, ArrowDownward } from '@mui/icons-material';
import { TransitionGroup } from 'react-transition-group';
import { Collapse } from '@mui/material';
import { styled } from '@mui/material/styles';
import { keyframes } from '@emotion/react';
import { ChartOptions } from 'chart.js';

interface SeasonStatsProps {
  player1: Player;
  player2: Player;
  isLoading: boolean;
  onRefresh?: () => void;
}

// Add stat configuration
const STAT_CONFIGS = {
  points: { label: 'Points', description: 'Average points per game' },
  assists: { label: 'Assists', description: 'Average assists per game' },
  rebounds: { label: 'Rebounds', description: 'Average rebounds per game' },
  efficiency: { label: 'Efficiency', description: 'Player Efficiency Rating (PER)' },
  winPercentage: { label: 'Win %', description: 'Team win percentage with player' },
  plusMinus: { label: '+/-', description: 'Average plus/minus rating' }
};

// Add type for matchup filter
type MatchupFilter = 'all' | 'regular' | 'playoffs';

// Add type for sort options
type SortOption = 'date' | 'scoreDiff' | 'player1Score' | 'player2Score';

// Add pagination state and config
const ITEMS_PER_PAGE = 10;

// Add fadeIn animation
export const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Add styled component for animated list items
const AnimatedListItem = styled(ListItem)(({ theme }) => ({
  transition: theme.transitions?.create(['transform', 'opacity'], {
    duration: theme.transitions?.duration?.standard,
  }),
  '&.entering': {
    opacity: 0,
    transform: 'translateY(20px)',
  },
  '&.entered': {
    opacity: 1,
    transform: 'translateY(0)',
  },
  '&.exiting': {
    opacity: 0,
    transform: 'translateY(-20px)',
  },
}));

// Add interface for matchup data
interface Matchup {
  date: string;
  type: 'regular' | 'playoffs';
  player1Score: number;
  player2Score: number;
  result: string;
}

export const SeasonStatsComponent: React.FC<SeasonStatsProps> = ({
  player1,
  player2,
  isLoading,
  onRefresh
}) => {
  const [error, setError] = React.useState<string | null>(null);
  const [selectedStat, setSelectedStat] = React.useState('points');
  const [matchupFilter, setMatchupFilter] = React.useState<MatchupFilter>('all');
  const [page, setPage] = React.useState(1);
  const [sortOption, setSortOption] = React.useState<SortOption>('date');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');
  const [sortMenuAnchor, setSortMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [filteredMatchups, setFilteredMatchups] = React.useState<Matchup[]>([]);
  const theme = useTheme();

  const history1 = mockPlayerHistory[player1.id];
  const history2 = mockPlayerHistory[player2.id];

  const chartData = {
    labels: history1?.seasons.map(s => s.season).reverse(),
    datasets: [
      {
        label: player1.name,
        data: history1?.seasons.map(s => s[selectedStat as keyof typeof s]).reverse(),
        borderColor: theme.palette.primary.main,
        backgroundColor: theme.palette.primary.main,
        fill: false,
        tension: 0.1,
        pointStyle: history1?.seasons.map(s => s.awards?.length ? 'star' : 'circle'),
        pointRadius: history1?.seasons.map(s => s.awards?.length ? 8 : 3)
      },
      {
        label: player2.name,
        data: history2?.seasons.map(s => s[selectedStat as keyof typeof s]).reverse(),
        borderColor: theme.palette.secondary.main,
        backgroundColor: theme.palette.secondary.main,
        fill: false,
        tension: 0.1,
        pointStyle: history2?.seasons.map(s => s.awards?.length ? 'star' : 'circle'),
        pointRadius: history2?.seasons.map(s => s.awards?.length ? 8 : 3)
      }
    ]
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: function(context) {
            const datasetIndex = context.datasetIndex;
            const index = context.dataIndex;
            const value = context.raw as number;
            const playerName = chartData.datasets[datasetIndex].label;

            // Get the season data for this point
            const season = datasetIndex === 0
              ? history1?.seasons[history1.seasons.length - 1 - index]
              : history2?.seasons[history2.seasons.length - 1 - index];
            
            let label = `${playerName}: ${value.toFixed(1)}`;
            if (season?.awards?.length) {
              label += ` 🏆 ${season.awards.join(', ')}`;
            }
            return label;
          }
        }
      },
      legend: {
        position: 'top'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => (value as number).toFixed(1)
        }
      }
    }
  };

  // Add useEffect to filter matchups
  React.useEffect(() => {
    if (history1?.matchups) {
      const filtered = history1.matchups.filter(matchup => {
        if (matchupFilter === 'all') return true;
        return matchup.type === matchupFilter;
      });
      setFilteredMatchups(filtered);
      setPage(1); // Reset page when filter changes
    }
  }, [history1?.matchups, matchupFilter]);

  // Add sort handler
  const handleSortChange = (option: SortOption) => {
    if (sortOption === option) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortOption(option);
      setSortDirection('desc');
    }
  };

  // Add sorting logic before pagination
  const sortedMatchups = React.useMemo(() => {
    return [...filteredMatchups].sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      switch (sortOption) {
        case 'date':
          return multiplier * (new Date(a.date).getTime() - new Date(b.date).getTime());
        case 'scoreDiff':
          const diffA = a.player1Score - a.player2Score;
          const diffB = b.player1Score - b.player2Score;
          return multiplier * (diffA - diffB);
        case 'player1Score':
          return multiplier * (a.player1Score - b.player1Score);
        case 'player2Score':
          return multiplier * (a.player2Score - b.player2Score);
        default:
          return 0;
      }
    });
  }, [filteredMatchups, sortOption, sortDirection]);

  // Update pagination to use sorted matchups
  const totalPages = Math.ceil(sortedMatchups.length / ITEMS_PER_PAGE);
  const paginatedMatchups = sortedMatchups.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // Add sort menu handlers
  const handleSortMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setSortMenuAnchor(event.currentTarget);
  };

  const handleSortMenuClose = () => {
    setSortMenuAnchor(null);
  };

  if (isLoading) {
    return (
      <AnimatedElement animation="fadeIn">
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Skeleton variant="text" width={200} height={32} />
          </Box>
          <Skeleton variant="rectangular" width="100%" height={48} sx={{ mb: 3 }} />
          <Skeleton variant="rectangular" width="100%" height={400} />
        </Paper>
      </AnimatedElement>
    );
  }

  if (error) {
    return (
      <AnimatedElement animation="fadeIn">
        <Paper sx={{ p: 3 }}>
          <Alert 
            severity="error"
            action={
              <IconButton
                color="inherit"
                size="small"
                onClick={() => setError(null)}
              >
                <Refresh />
              </IconButton>
            }
          >
            {error}
          </Alert>
        </Paper>
      </AnimatedElement>
    );
  }

  if (!history1 || !history2) {
    return (
      <AnimatedElement animation="fadeIn">
        <Paper sx={{ p: 3 }}>
          <Alert severity="info">
            Historical data not available for one or both players.
          </Alert>
        </Paper>
      </AnimatedElement>
    );
  }

  return (
    <AnimatedElement animation="fadeIn">
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Historical Performance</Typography>
          <Tooltip title="Compare player statistics across seasons. Stars indicate award-winning seasons.">
            <IconButton size="small" sx={{ ml: 1 }}>
              <Info fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        
        <Tabs
          value={selectedStat}
          onChange={(_, newValue) => setSelectedStat(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 3 }}
        >
          {Object.entries(STAT_CONFIGS).map(([key, { label }]) => (
            <Tab 
              key={key}
              label={label}
              value={key}
              sx={{ minWidth: 'auto' }}
            />
          ))}
        </Tabs>

        <Box sx={{ height: 400 }}>
          <Line data={chartData} options={options} />
        </Box>

        <Divider sx={{ my: 4 }} />

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <EmojiEvents sx={{ mr: 1 }} />
              <Typography variant="h6">Career Highlights</Typography>
            </Box>
            {isLoading ? (
              <Grid container spacing={2}>
                {[1, 2].map((col) => (
                  <Grid item xs={6} key={col}>
                    <Skeleton variant="text" width={120} height={24} />
                    {[1, 2, 3].map((row) => (
                      <Box key={row} sx={{ my: 2 }}>
                        <Skeleton variant="text" width="90%" />
                        <Skeleton variant="text" width="60%" />
                      </Box>
                    ))}
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    {player1.name}
                  </Typography>
                  <List dense>
                    {history1?.careerHighs && Object.entries(history1.careerHighs).map(([stat, data]) => (
                      <ListItem key={stat}>
                        <ListItemText
                          primary={`${STAT_CONFIGS[stat as keyof typeof STAT_CONFIGS]?.label || stat}: ${data.value}`}
                          secondary={`vs ${data.opponent} (${new Date(data.date).toLocaleDateString()})`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="secondary" gutterBottom>
                    {player2.name}
                  </Typography>
                  <List dense>
                    {history2?.careerHighs && Object.entries(history2.careerHighs).map(([stat, data]) => (
                      <ListItem key={stat}>
                        <ListItemText
                          primary={`${STAT_CONFIGS[stat as keyof typeof STAT_CONFIGS]?.label || stat}: ${data.value}`}
                          secondary={`vs ${data.opponent} (${new Date(data.date).toLocaleDateString()})`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              </Grid>
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CompareArrows sx={{ mr: 1 }} />
                <Typography variant="h6">Head-to-Head History</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ToggleButtonGroup
                  value={matchupFilter}
                  exclusive
                  onChange={(_, value) => value && setMatchupFilter(value as MatchupFilter)}
                  size="small"
                >
                  <ToggleButton value="all">All</ToggleButton>
                  <ToggleButton value="regular">Regular</ToggleButton>
                  <ToggleButton value="playoffs">Playoffs</ToggleButton>
                </ToggleButtonGroup>
                {onRefresh && (
                  <Tooltip title="Refresh data">
                    <IconButton onClick={onRefresh} size="small">
                      <Refresh />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
            {isLoading ? (
              <Box>
                {[1, 2, 3].map((i) => (
                  <Box key={i} sx={{ my: 2 }}>
                    <Skeleton variant="text" width="100%" />
                    <Skeleton variant="text" width="60%" />
                  </Box>
                ))}
              </Box>
            ) : (
              <List dense>
                <TransitionGroup>
                  {paginatedMatchups.map((matchup, index) => (
                    <Collapse key={`${matchup.date}-${matchup.player1Score}-${matchup.player2Score}`}>
                      <AnimatedListItem
                        sx={{
                          opacity: 0,
                          animation: `${fadeIn} 0.3s ease-out ${index * 50}ms forwards`,
                        }}
                      >
                        <ListItemText
                          primary={`${player1.name} ${matchup.player1Score} - ${matchup.player2Score} ${player2.name}`}
                          secondary={
                            <Typography variant="body2" color="text.secondary">
                              {new Date(matchup.date).toLocaleDateString()} • 
                              {matchup.type === 'playoffs' ? ' Playoffs • ' : ' Regular Season • '}
                              {matchup.result}
                            </Typography>
                          }
                        />
                      </AnimatedListItem>
                    </Collapse>
                  ))}
                </TransitionGroup>
                {filteredMatchups.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    No {matchupFilter === 'all' ? '' : matchupFilter} matchups found
                  </Typography>
                )}
                {filteredMatchups.length > ITEMS_PER_PAGE && (
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                    <Pagination 
                      count={totalPages}
                      page={page}
                      onChange={(_, newPage) => setPage(newPage)}
                      color="primary"
                      size="small"
                    />
                  </Box>
                )}
              </List>
            )}
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Tooltip title="Sort matchups">
            <IconButton 
              onClick={handleSortMenuOpen} 
              size="small"
              sx={{
                transform: 'rotate(0deg)',
                transition: theme.transitions.create('transform', {
                  duration: theme.transitions.duration.shorter,
                }),
                ...(Boolean(sortMenuAnchor) && {
                  transform: 'rotate(180deg)',
                }),
              }}
            >
              <Sort />
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={sortMenuAnchor}
            open={Boolean(sortMenuAnchor)}
            onClose={handleSortMenuClose}
          >
            {[
              { option: 'date', label: 'Date' },
              { option: 'scoreDiff', label: 'Score Difference' },
              { option: 'player1Score', label: `${player1.name}'s Score` },
              { option: 'player2Score', label: `${player2.name}'s Score` }
            ].map(({ option, label }) => (
              <MenuItem 
                key={option}
                onClick={() => {
                  handleSortChange(option as SortOption);
                  handleSortMenuClose();
                }}
              >
                <ListItemIcon
                  sx={{
                    transition: theme.transitions.create(['opacity', 'transform'], {
                      duration: theme.transitions.duration.shorter,
                    }),
                    opacity: sortOption === option ? 1 : 0,
                    transform: sortOption === option 
                      ? 'scale(1) rotate(0deg)' 
                      : 'scale(0.5) rotate(-90deg)',
                  }}
                >
                  {sortOption === option && (
                    sortDirection === 'asc' ? <ArrowUpward /> : <ArrowDownward />
                  )}
                </ListItemIcon>
                <ListItemText>{label}</ListItemText>
              </MenuItem>
            ))}
          </Menu>
        </Box>

        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 1,
          px: 2 
        }}>
          <Typography variant="subtitle2" color="text.secondary">
            {filteredMatchups.length} Matchups
          </Typography>
          <Fade in={Boolean(filteredMatchups.length)}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {page * ITEMS_PER_PAGE - ITEMS_PER_PAGE + 1}-
                {Math.min(page * ITEMS_PER_PAGE, filteredMatchups.length)} of {filteredMatchups.length}
              </Typography>
            </Box>
          </Fade>
        </Box>
      </Paper>
    </AnimatedElement>
  );
};

export default SeasonStatsComponent; 