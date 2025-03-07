import React, { useState, useEffect, useCallback } from 'react';
import { 
  Typography, 
  Box, 
  Grid, 
  Autocomplete, 
  TextField,
  Paper,
  Button,
  Alert,
  Fade,
  IconButton,
  Container,
  Stack,
  Divider,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Tab,
  Tabs
} from '@mui/material';
import { useSound } from '../contexts/SoundContext';
import { TransitionComponent } from '../components/common/TransitionComponent';
import { Player, PlayerStats } from '../types/player';
import ComparisonTable from '../components/ComparisonTable';
import PlayerRadarChart from '../components/PlayerRadarChart';
import { getPlayerStats } from '../services/statsService';
import { ComparisonSkeleton } from '../components/skeletons/ComparisonSkeleton';
import { ErrorLogger } from '../utils/errorLogger';
import { Bookmark, BookmarkBorder, CompareArrows } from '@mui/icons-material';
import { useFavorites } from '../hooks/useFavorites';
import FavoriteComparisons from '../components/FavoriteComparisons';
import PlayerSearch from '../components/PlayerSearch';
import { useQuery } from '@tanstack/react-query';
import { getPlayerStatsComparison } from '../services/statsService';
import { usePlayerStats } from '../hooks/useNbaData';
import { StatsSummary } from '../components/StatsSummary';
import { withErrorHandling } from '../hocs/withErrorHandling';
import { useAsync } from '../hooks/useAsync';
import { AnimatedElement } from '../components/common/AnimatedElement';
import { StaggeredContainer } from '../components/common/StaggeredContainer';
import { usePlayerComparison } from '../hooks/usePlayerComparison';
import { StatComparison } from '../components/StatComparison';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { validateStats } from '../utils/validationUtils';
import { statValidations } from '../validations/statValidations';
import { useStatsValidation } from '../hooks/useStatsValidation';
import { ValidationErrors } from '../components/common/ValidationErrors';
import { usePlayerSelectionValidation } from '../hooks/usePlayerSelectionValidation';
import SeasonStatsComponent from '../components/SeasonStats';
import { ComparisonData } from '../types/player';
import { StatsSkeleton } from '../components/skeletons/StatsSkeleton';
import { RadarChartSkeleton } from '../components/skeletons/RadarChartSkeleton';
import { MatchupHistorySkeleton } from '../components/skeletons/MatchupHistorySkeleton';
import SeasonSelector from '../components/SeasonSelector';
import HeadToHeadComparison from '../components/HeadToHeadComparison';
import PlayerCareerTrends from '../components/PlayerCareerTrends';
import AdvancedStats from '../components/AdvancedStats';
import { usePlayerSeasons } from '../hooks/usePlayerSeasons';
import { useHeadToHead } from '../hooks/useHeadToHead';
import { config } from '../utils/config';

// Mock data for testing
const mockPlayers: Player[] = [
  { id: 1, name: 'LeBron James', team: 'Lakers', position: 'F' },
  { id: 2, name: 'Stephen Curry', team: 'Warriors', position: 'G' },
  // Add more players as needed
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`comparison-tabpanel-${index}`}
      aria-labelledby={`comparison-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export const PlayerComparison: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { playSound } = useSound();
  const [player1, setPlayer1] = useState<Player | null>(null);
  const [player2, setPlayer2] = useState<Player | null>(null);
  const [season, setSeason] = useState<string>(config.defaultSeason);
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const { validationErrors: statsErrors, validatePlayerStats, clearErrors: clearStatsErrors } = useStatsValidation();
  const { errors: selectionErrors, validateSelection, clearErrors: clearSelectionErrors } = usePlayerSelectionValidation();
  const [tabValue, setTabValue] = useState(0);

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['playerStatsComparison', player1?.id, player2?.id],
    queryFn: () => getPlayerStatsComparison(player1!.id, player2!.id),
    enabled: !!player1 && !!player2 && !!season,
  });

  const { 
    data: stats1, 
    isLoading: isLoading1, 
    error: error1 
  } = usePlayerStats(player1?.id);
  
  const { 
    data: stats2, 
    isLoading: isLoading2, 
    error: error2 
  } = usePlayerStats(player2?.id);
  
  const isLoading = isLoading1 || isLoading2;
  const hasError = error1 || error2;

  const { 
    player1Stats: comparisonData, 
    isLoading: isComparisonLoading, 
    error: comparisonError 
  } = usePlayerComparison(player1, player2);

  const combinedError = error1 || error2 || comparisonError;

  // Validate stats
  const validationResult1 = stats1 ? validateStats(stats1, statValidations) : { isValid: true, errors: [] };
  const validationResult2 = stats2 ? validateStats(stats2, statValidations) : { isValid: true, errors: [] };

  const {
    player1Seasons,
    player2Seasons,
    isLoading: seasonsLoading,
    error: seasonsError
  } = usePlayerSeasons(player1, player2);
  
  const {
    matchups,
    isLoading: matchupsLoading,
    error: matchupsError
  } = useHeadToHead(player1, player2);
  
  const isLoadingPlayerComparison = isLoading || seasonsLoading || matchupsLoading;
  const errorPlayerComparison = error1 || error2 || comparisonError || seasonsError || matchupsError;

  const handleCompare = () => {
    if (player1 && player2) {
      playSound('click');
    }
  };

  const handleToggleFavorite = () => {
    if (player1 && player2) {
      const id = `${player1.id}-${player2.id}`;
      if (isFavorite(id)) {
        removeFavorite(id);
      } else {
        addFavorite(player1, player2);
      }
      playSound('switch');
    }
  };

  const handlePlayerSelect = useCallback((player: Player | null, isFirstPlayer: boolean) => {
    clearSelectionErrors();
    if (isFirstPlayer) {
      setPlayer1(player);
    } else {
      setPlayer2(player);
    }
  }, [clearSelectionErrors]);

  const handleButtonHover = () => {
    playSound('hover');
  };

  // Validate stats when they are loaded
  useEffect(() => {
    if (statsData && !validatePlayerStats(statsData.headToHeadStats.player1)) {
      // Handle the case where the comparison data is invalid
      console.error('Comparison data is invalid');
    }
  }, [statsData]);

  // Validate player selection whenever it changes
  useEffect(() => {
    validateSelection(player1, player2);
  }, [player1, player2, validateSelection]);

  // Only render comparison components when both players are selected and data is loaded
  const shouldShowComparison = player1 && player2 && stats1 && stats2;

  const handleSaveComparison = () => {
    if (player1 && player2 && stats1 && stats2) {
      addFavorite({
        id: `${player1.id}-${player2.id}`,
        player1,
        player2,
        timestamp: Date.now()
      });
    }
  };

  const canSaveComparison = player1 && player2 && !isLoadingPlayerComparison && !errorPlayerComparison;
  const isComparisonSaved = player1 && player2 && isFavorite(`${player1.id}-${player2.id}`);

  const handleSeasonChange = (newSeason: string) => {
    setSeason(newSeason);
    playSound('select');
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    playSound('select');
  };

  if (isLoadingPlayerComparison) {
    return <ComparisonSkeleton />;
  }

  return (
    <ErrorBoundary>
      <Container maxWidth="lg">
        <Typography variant="h4" component="h1" gutterBottom>
          Player Comparison
        </Typography>
        
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Select Players to Compare
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <PlayerSearch
                    value={player1}
                    onChange={(player: Player | null) => handlePlayerSelect(player, true)}
                    label="Select First Player"
                    required
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <PlayerSearch
                    value={player2}
                    onChange={(player: Player | null) => handlePlayerSelect(player, false)}
                    label="Select Second Player"
                    required
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <SeasonSelector
                    value={season}
                    onChange={handleSeasonChange}
                    disabled={!player1 || !player2}
                  />
                </Grid>
              </Grid>
              
              <ValidationErrors 
                errors={selectionErrors.filter(e => !e.includes('first player') && !e.includes('second player'))}
                title="Selection Errors"
                severity="warning"
                onClose={clearSelectionErrors}
              />

              <ValidationErrors 
                errors={statsErrors}
                title="Stats Validation"
                onClose={clearStatsErrors}
              />
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FavoriteComparisons 
              onSelectComparison={(favorite) => {
                setPlayer1(favorite.player1);
                setPlayer2(favorite.player2);
                playSound('select');
              }}
            />
          </Grid>
        </Grid>
        
        {errorPlayerComparison && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Error loading player statistics. Please try again.
          </Alert>
        )}
        
        {isLoadingPlayerComparison && <ComparisonSkeleton />}
        
        {shouldShowComparison && (
          <>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange}
                variant={isMobile ? "scrollable" : "standard"}
                scrollButtons={isMobile ? "auto" : undefined}
              >
                <Tab label="Basic Stats" />
                <Tab label="Advanced Stats" />
                <Tab label="Career Trends" />
                <Tab label="Head-to-Head" />
              </Tabs>
            </Box>
            
            <TabPanel value={tabValue} index={0}>
              <ComparisonTable 
                player1={player1}
                player2={player2}
                player1Stats={stats1}
                player2Stats={stats2}
              />
              
              <PlayerRadarChart 
                player1={player1}
                player2={player2}
                player1Stats={stats1}
                player2Stats={stats2}
              />
            </TabPanel>
            
            <TabPanel value={tabValue} index={1}>
              <AdvancedStats
                player1={player1}
                player2={player2}
                player1Stats={stats1}
                player2Stats={stats2}
              />
            </TabPanel>
            
            <TabPanel value={tabValue} index={2}>
              <PlayerCareerTrends
                player1={player1}
                player2={player2}
                player1Seasons={player1Seasons}
                player2Seasons={player2Seasons}
              />
            </TabPanel>
            
            <TabPanel value={tabValue} index={3}>
              <HeadToHeadComparison
                player1={player1}
                player2={player2}
                matchups={matchups}
              />
            </TabPanel>
          </>
        )}
      </Container>
    </ErrorBoundary>
  );
};

export default withErrorHandling(PlayerComparison, (error) => {
  console.error('PlayerComparison error:', error);
}); 