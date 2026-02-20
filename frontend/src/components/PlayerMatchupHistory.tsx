import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Theme } from '@mui/material/styles';
import {
  Box,
  Paper,
  Typography,
  useTheme,
  Tooltip,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  Button,
  CircularProgress,
  Collapse,
} from '@mui/material';
import {
  Line,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Area,
} from 'recharts';
import { Info, EmojiEvents, Refresh, ExpandMore, ExpandLess, Timeline, CompareArrows } from '@mui/icons-material';
import { Season } from './SeasonSelector';
import { PlayerStats } from '../types/player';
import { keyframes as muiKeyframes } from '@mui/system';

interface MatchupGame {
  date: string;
  player1Score: number;
  player2Score: number;
  player1Efficiency: number;
  player2Efficiency: number;
  gameResult: 'win' | 'loss';
  statline1: string;
  statline2: string;
}

interface PlayerMatchupHistoryProps {
  player1Name: string;
  player2Name: string;
  matchupHistory: MatchupGame[];
  stats1: Record<Season, PlayerStats>;
  stats2: Record<Season, PlayerStats>;
}

// Move all constants to the top of the file
const INITIAL_LOAD_COUNT = 5;
const LOAD_MORE_COUNT = 5;
const TRANSITION_DURATION = 300;
const STAGGER_DELAY = 200;

// Add advanced metrics calculation helpers
const calculateBPM = (stats: PlayerStats) => {
  // Simplified BPM calculation
  const rawBPM = (
    (stats.points * 0.1) + 
    (stats.rebounds * 0.7) + 
    (stats.assists * 1.2) + 
    (stats.steals * 1.4) + 
    (stats.blocks * 0.7) - 
    (stats.turnovers * 1.4)
  ) / stats.minutesPerGame;
  
  return rawBPM - 2.0; // League average offset
};

const calculateVORP = (stats: PlayerStats) => {
  const bpm = calculateBPM(stats);
  const replacementLevel = -2.0;
  return (bpm - replacementLevel) * (stats.minutesPerGame / 48) * (stats.gamesPlayed / 82);
};

const calculateGameScore = (stats: PlayerStats) => {
  return (
    stats.points + 
    (0.4 * stats.fieldGoalsMade) - 
    (0.7 * stats.fieldGoalsAttempted) - 
    (0.4 * (stats.freeThrowsAttempted - stats.freeThrowsMade)) + 
    (0.7 * stats.offensiveRebounds) + 
    (0.3 * stats.defensiveRebounds) + 
    stats.steals + 
    (0.7 * stats.assists) + 
    (0.7 * stats.blocks) - 
    (0.4 * stats.personalFouls) - 
    stats.turnovers
  );
};

// Add more advanced metrics calculation helpers
const calculatePIE = (stats: PlayerStats) => {
  // Player Impact Estimate (PIE) calculation
  const numerator = (
    stats.points + 
    stats.fieldGoalsMade + 
    (stats.freeThrowsMade * 0.5) + 
    stats.defensiveRebounds + 
    (stats.offensiveRebounds * 1.4) + 
    stats.assists + 
    (stats.steals * 2) + 
    (stats.blocks * 2) - 
    stats.fieldGoalsAttempted - 
    (stats.freeThrowsAttempted * 0.4) - 
    (stats.turnovers * 1.4)
  );
  
  // League average denominator approximation
  const denominator = 100;
  return (numerator / denominator) * 100;
};

const calculateNetRating = (stats: PlayerStats) => {
  // Net Rating = Offensive Rating - Defensive Rating
  const offRtg = (stats.points * 100) / (
    stats.fieldGoalsAttempted + 
    (0.44 * stats.freeThrowsAttempted) + 
    stats.turnovers
  );
  return offRtg - stats.defensiveRating;
};

const calculateScoreCreation = (stats: PlayerStats) => {
  // Points created by scoring and assists
  const assistPoints = stats.assists * 2.5; // Assuming average of 2.5 points per assist
  return stats.points + assistPoints;
};

// Add more advanced metrics calculation helpers
const calculatePIPM = (stats: PlayerStats) => {
  // Player Impact Plus/Minus calculation
  const boxScoreValue = (
    (stats.points * 0.8) + 
    (stats.assists * 1.3) + 
    (stats.rebounds * 0.7) + 
    (stats.steals * 1.5) + 
    (stats.blocks * 1.2) - 
    (stats.turnovers * 1.2) - 
    ((stats.fieldGoalsAttempted - stats.fieldGoalsMade) * 0.5)
  ) / stats.minutesPerGame;

  const plusMinusImpact = stats.plusMinus / stats.minutesPerGame;
  
  return boxScoreValue + (plusMinusImpact * 0.7);
};

const calculateLineupAdjustedPlusMinus = (stats: PlayerStats) => {
  // Lineup-adjusted Plus/Minus approximation
  const baseValue = stats.plusMinus / stats.minutesPerGame;
  const teamImpact = (stats.points + stats.assists * 2) / stats.minutesPerGame;
  return baseValue * (1 + (teamImpact / 50));
};

const calculateScaledEfficiency = (stats: PlayerStats) => {
  // Scaled efficiency rating (0-100)
  const efficiency = (
    (stats.points * 1.0) +
    (stats.assists * 2.0) +
    (stats.rebounds * 1.2) +
    (stats.steals * 2.0) +
    (stats.blocks * 2.0) -
    (stats.turnovers * 1.5) -
    ((stats.fieldGoalsAttempted - stats.fieldGoalsMade) * 0.8)
  ) / stats.minutesPerGame;

  // Scale to 0-100
  return Math.min(100, Math.max(0, efficiency * 2.5));
};

// Add predictive analytics helpers
const calculateTrendline = (data: number[]) => {
  const n = data.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = data;
  
  // Calculate means
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  
  // Calculate slope and intercept
  const numerator = x.reduce((acc, xi, i) => acc + (xi - meanX) * (y[i] - meanY), 0);
  const denominator = x.reduce((acc, xi) => acc + Math.pow(xi - meanX, 2), 0);
  
  const slope = numerator / denominator;
  const intercept = meanY - slope * meanX;
  
  // Project next value
  const nextValue = slope * n + intercept;
  const trend = slope > 0 ? 'improving' : slope < 0 ? 'declining' : 'stable';
  const confidence = Math.min(1, Math.abs(slope) / meanY);
  
  return { nextValue, trend, confidence };
};

const calculatePerformanceProjection = (stats: Record<Season, PlayerStats> | undefined, stat: keyof PlayerStats) => {
  if (!stats) {
    return {
      projectedValue: 0,
      trend: 'stable',
      confidence: 0,
      description: 'Insufficient data'
    };
  }

  const seasons = Object.keys(stats);
  if (seasons.length === 0) {
    return {
      projectedValue: 0,
      trend: 'stable',
      confidence: 0,
      description: 'No seasonal data available'
    };
  }

  const values = seasons.map(season => stats[season as Season][stat]).filter((v): v is number => v !== undefined);
  const { nextValue, trend, confidence } = calculateTrendline(values);
  
  // Add age-based adjustment
  const currentAge = 28; // This should come from player data
  const ageAdjustment = currentAge > 32 ? -0.05 : currentAge < 25 ? 0.05 : 0;
  
  return {
    projectedValue: nextValue * (1 + ageAdjustment),
    trend,
    confidence,
    description: `${trend} trend with ${(confidence * 100).toFixed(0)}% confidence`
  };
};

// Add new predictive stats
const predictiveStats = [
  { 
    key: 'projectedPER',
    label: 'Proj. PER',
    color: 'primary',
    format: '0.1',
    category: 'predictive',
    calculate: (_stats: PlayerStats, allStats?: Record<Season, PlayerStats>) => {
      const projection = calculatePerformanceProjection(allStats, 'playerEfficiencyRating');
      return projection.projectedValue;
    },
    description: 'Projected Player Efficiency Rating for next season'
  },
  {
    key: 'projectedPoints',
    label: 'Proj. PTS',
    color: 'secondary',
    format: '0.1',
    category: 'predictive',
    calculate: (_stats: PlayerStats, allStats?: Record<Season, PlayerStats>) => {
      const projection = calculatePerformanceProjection(allStats, 'points');
      return projection.projectedValue;
    },
    description: 'Projected Points per Game for next season'
  },
  {
    key: 'improvementPotential',
    label: 'Potential',
    color: 'success',
    format: '0.1',
    suffix: '%',
    category: 'predictive',
    calculate: (_stats: PlayerStats, allStats?: Record<Season, PlayerStats>) => {
      const recentStats = Object.values(allStats ?? {}).slice(-3);
      const trends = [
        calculateTrendline(recentStats.map(s => s.points)),
        calculateTrendline(recentStats.map(s => s.assists)),
        calculateTrendline(recentStats.map(s => s.rebounds))
      ];
      
      const positiveCount = trends.filter(t => t.trend === 'improving').length;
      return (positiveCount / trends.length) * 100;
    },
    description: 'Percentage of key stats showing positive trends'
  }
];

// Expand stat categories with advanced metrics
const trendStats: TrendStat[] = [
  {
    key: 'per',
    label: 'PER',
    category: 'advanced',
    color: 'secondary',
    format: '0.1',
    description: 'Player Efficiency Rating - measures per-minute production'
  },
  { 
    key: 'trueShootingPercentage',
    label: 'TS%',
    category: 'scoring',
    color: 'success',
    format: '0.1',
    suffix: '%',
    description: 'True Shooting Percentage - shooting efficiency including all shot types'
  },
  { 
    key: 'usageRate',
    label: 'Usage',
    category: 'advanced',
    color: 'error',
    format: '0.1',
    suffix: '%',
    calculate: (stats: PlayerStats) => (stats.points / stats.minutesPerGame) * 100
  },
  { 
    key: 'assistToTurnover',
    label: 'AST/TO',
    category: 'efficiency',
    color: 'primary',
    format: '0.2',
    calculate: (stats: PlayerStats) => (stats.assists / stats.turnovers)
  },
  { 
    key: 'defensiveRating',
    label: 'DEF RTG',
    category: 'advanced',
    color: 'success',
    format: '0.1',
    calculate: calculateNetRating
  },
  { 
    key: 'pointsPer36',
    label: 'PTS/36',
    category: 'per36',
    calculate: (stats: PlayerStats) => (stats.points / stats.minutesPerGame) * 36
  },
  { 
    key: 'assistsPer36',
    label: 'AST/36',
    category: 'per36',
    calculate: (stats: PlayerStats) => (stats.assists / stats.minutesPerGame) * 36
  },
  { 
    key: 'reboundsPer36',
    label: 'REB/36',
    category: 'per36',
    calculate: (stats: PlayerStats) => (stats.rebounds / stats.minutesPerGame) * 36
  },
  { 
    key: 'pointsPer100',
    label: 'PTS/100',
    category: 'per100',
    calculate: (stats: PlayerStats) => (stats.points / stats.minutesPerGame) * 100 / 2.2 // Rough possession estimate
  },
  { 
    key: 'assistsPer100',
    label: 'AST/100',
    category: 'per100',
    calculate: (stats: PlayerStats) => (stats.assists / stats.minutesPerGame) * 100 / 2.2
  },
  { 
    key: 'reboundsPer100',
    label: 'REB/100',
    category: 'per100',
    calculate: (stats: PlayerStats) => (stats.rebounds / stats.minutesPerGame) * 100 / 2.2
  },
  { 
    key: 'bpm',
    label: 'BPM',
    category: 'advanced',
    calculate: calculateBPM,
    description: 'Box Plus/Minus - Points per 100 possessions above league average'
  },
  { 
    key: 'vorp',
    label: 'VORP',
    category: 'advanced',
    calculate: calculateVORP,
    description: 'Value Over Replacement Player'
  },
  { 
    key: 'gameScore',
    label: 'GmSc',
    category: 'advanced',
    calculate: calculateGameScore,
    description: 'Game Score - Overall game performance metric'
  },
  { 
    key: 'winShares',
    label: 'WS/48',
    category: 'advanced',
    calculate: (stats: PlayerStats) => {
      // Simplified Win Shares per 48 minutes calculation
      const offensiveWS = (stats.points * 0.037 + stats.assists * 0.14) / stats.minutesPerGame;
      const defensiveWS = (stats.steals * 0.14 + stats.blocks * 0.1 + stats.defensiveRebounds * 0.034) / stats.minutesPerGame;
      return (offensiveWS + defensiveWS) * 48;
    },
    description: 'Win Shares per 48 minutes'
  },
  { 
    key: 'offensiveRating',
    label: 'ORtg',
    category: 'advanced',
    calculate: (stats: PlayerStats) => {
      // Simplified Offensive Rating calculation
      return (stats.points * 100) / (
        stats.fieldGoalsAttempted + 
        (0.44 * stats.freeThrowsAttempted) + 
        stats.turnovers
      );
    },
    description: 'Points produced per 100 possessions'
  },
  { 
    key: 'pie',
    label: 'PIE',
    category: 'advanced',
    calculate: calculatePIE,
    description: 'Player Impact Estimate - Overall contribution percentage'
  },
  { 
    key: 'netRating',
    label: 'Net Rtg',
    category: 'advanced',
    calculate: calculateNetRating,
    description: 'Net Rating - Point differential per 100 possessions'
  },
  { 
    key: 'scoreCreation',
    label: 'Pts Created',
    category: 'advanced',
    calculate: calculateScoreCreation,
    description: 'Points Created - Combined scoring and assist points'
  },
  { 
    key: 'efficiencyScore',
    label: 'Eff Score',
    category: 'advanced',
    calculate: (stats: PlayerStats) => {
      // Custom efficiency metric
      return (
        (stats.points * 1.0) +
        (stats.assists * 2.5) +
        (stats.rebounds * 1.2) +
        (stats.steals * 2.0) +
        (stats.blocks * 2.0) -
        (stats.turnovers * 2.0) -
        ((stats.fieldGoalsAttempted - stats.fieldGoalsMade) * 0.8) -
        ((stats.freeThrowsAttempted - stats.freeThrowsMade) * 0.4)
      ) / stats.minutesPerGame;
    },
    description: 'Efficiency Score - Comprehensive efficiency metric'
  },
  { 
    key: 'clutchRating',
    label: 'Clutch',
    category: 'advanced',
    calculate: (stats: PlayerStats) => {
      // Simplified clutch performance rating
      const clutchFactor = stats.plusMinus > 0 ? 1.2 : 0.8;
      return (
        (stats.points * 0.4) +
        (stats.assists * 0.3) +
        (stats.rebounds * 0.2) +
        (stats.steals * 0.5) +
        (stats.blocks * 0.5)
      ) * clutchFactor;
    },
    description: 'Clutch Rating - Performance in high-leverage situations'
  },
  { 
    key: 'pipm',
    label: 'PIPM',
    category: 'advanced',
    calculate: calculatePIPM,
    description: 'Player Impact Plus/Minus - Combined box score and plus/minus impact'
  },
  { 
    key: 'lapm',
    label: 'LAPM',
    category: 'advanced',
    calculate: calculateLineupAdjustedPlusMinus,
    description: 'Lineup-Adjusted Plus/Minus - Contextual impact rating'
  },
  { 
    key: 'scaledEfficiency',
    label: 'Eff Rating',
    category: 'advanced',
    calculate: calculateScaledEfficiency,
    description: 'Scaled Efficiency Rating (0-100) - Overall performance score'
  },
  { 
    key: 'impactScore',
    label: 'Impact',
    category: 'advanced',
    calculate: (stats: PlayerStats) => {
      const usage = stats.usageRate ?? 0;
      const efficiency = stats.trueShootingPercentage ?? 0;
      const playmaking = (stats.assists * 2 - stats.turnovers) / stats.minutesPerGame;
      const defense = (stats.steals + stats.blocks - stats.personalFouls) / stats.minutesPerGame;

      return (
        (usage * 0.3) +
        (efficiency * 0.3) +
        (playmaking * 0.2) +
        (defense * 0.2)
      );
    },
    description: 'Impact Score - Combined usage, efficiency, playmaking, and defense'
  },
  { 
    key: 'versatilityIndex',
    label: 'Versatility',
    category: 'advanced',
    calculate: (stats: PlayerStats) => {
      const scoring = stats.points / stats.minutesPerGame;
      const playmaking = stats.assists / stats.minutesPerGame;
      const rebounding = stats.rebounds / stats.minutesPerGame;
      const defense = (stats.steals + stats.blocks) / stats.minutesPerGame;
      
      // Calculate standard deviation to measure versatility
      const values = [scoring, playmaking, rebounding, defense];
      const mean = values.reduce((a, b) => a + b) / values.length;
      const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
      
      return 10 * (1 - Math.sqrt(variance) / mean); // Higher score = more versatile
    },
    description: 'Versatility Index - Balance across different aspects of the game'
  },
  ...predictiveStats
] as const;

// Add type-safe stat categories
const statCategories: StatCategory[] = [
  { id: 'basic', label: 'Basic', color: 'primary' },
  { id: 'advanced', label: 'Advanced', color: 'secondary' },
  { id: 'scoring', label: 'Scoring', color: 'success' }
];








// Add type-safe error boundary
class PlayerStatsErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('PlayerMatchupHistory error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="error" gutterBottom>
            {this.state.error?.message || 'An error occurred while displaying stats'}
          </Typography>
          <Button
            variant="contained"
            onClick={() => this.setState({ hasError: false, error: null })}
            startIcon={<Refresh />}
          >
            Try Again
          </Button>
        </Paper>
      );
    }

    return this.props.children;
  }
}

// Replace keyframes definition with muiKeyframes
const keyframes = {
  shimmer: muiKeyframes`
    0% { transform: translateX(-100%) }
    100% { transform: translateX(100%) }
  `,
  fadeSlideIn: muiKeyframes`
    0% { opacity: 0; transform: translateY(20px) }
    100% { opacity: 1; transform: translateY(0) }
  `,
  pulse: muiKeyframes`
    0% { transform: scale(1) }
    50% { transform: scale(1.05) }
    100% { transform: scale(1) }
  `,
  slideInRight: muiKeyframes`
    0% { transform: translateX(100%); opacity: 0 }
    100% { transform: translateX(0); opacity: 1 }
  `,
  slideInLeft: muiKeyframes`
    0% { transform: translateX(-100%); opacity: 0 }
    100% { transform: translateX(0); opacity: 1 }
  `,
  ripple: muiKeyframes`
    0% { transform: scale(0); opacity: 1 }
    100% { transform: scale(4); opacity: 0 }
  `,
  float: muiKeyframes`
    0% { transform: translateY(0px) }
    50% { transform: translateY(-10px) }
    100% { transform: translateY(0px) }
  `
};

// Add ripple effect component
const RippleEffect = () => (
  <Box
    sx={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: 10,
      height: 10,
      borderRadius: '50%',
      backgroundColor: 'primary.main',
      transform: 'translate(-50%, -50%)',
      animation: `${keyframes.ripple} 1s ease-out infinite`,
      opacity: 0.2
    }}
  />
);

// TransitionBox with explicit display name
const TransitionBox = React.forwardRef<
  HTMLDivElement,
  { 
    in: boolean; 
    children: React.ReactNode;
    delay?: number;
    direction?: 'up' | 'down' | 'left' | 'right';
    hover?: boolean;
  }
>((props, ref) => (
  <Box
    ref={ref}
    sx={{
      position: 'relative',
      transition: `all ${TRANSITION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      opacity: props.in ? 1 : 0,
      transform: props.in 
        ? 'scale(1) translate(0, 0)' 
        : `scale(0.98) translate${props.direction === 'left' ? 'X(-20px)' 
          : props.direction === 'right' ? 'X(20px)'
          : props.direction === 'up' ? 'Y(-20px)'
          : 'Y(20px)'}`,
      transitionDelay: `${props.delay || 0}ms`,
      '&:hover': props.hover ? {
        transform: 'translateY(-5px)',
        '& > *': {
          animation: `${keyframes.float} 2s ease-in-out infinite`
        }
      } : {}
    }}
  >
    {props.children}
    {props.hover && <RippleEffect />}
  </Box>
));

TransitionBox.displayName = 'TransitionBox';

// Update ChartLoadingOverlay component
const ChartLoadingOverlay: React.FC<ChartLoadingOverlayProps> = ({ isLoading }) => (
  <Box
    sx={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      bgcolor: 'rgba(255,255,255,0.8)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: isLoading ? 1 : 0,
      visibility: isLoading ? 'visible' : 'hidden',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      zIndex: 1,
    }}
  >
    <CircularProgress />
  </Box>
);

// Wrap the main component with error boundary
const PlayerMatchupHistoryWithErrorBoundary: React.FC<PlayerMatchupHistoryProps> = (props) => (
  <PlayerStatsErrorBoundary>
    <PlayerMatchupHistory {...props} />
  </PlayerStatsErrorBoundary>
);

// Add collapsible section component
const CollapsibleSection = ({ 
  title,
  icon: Icon,
  tooltip,
  children,
  defaultExpanded = true,
  onToggle
}: { 
  title: string;
  icon: React.ElementType;
  tooltip?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleToggle = useCallback(() => {
    setIsExpanded(!isExpanded);
    onToggle?.(!isExpanded);
  }, [isExpanded, onToggle]);

  return (
    <AnimatedSectionContainer elevation={1}>
      <Box 
        sx={{ 
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' }
        }}
        onClick={handleToggle}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <SectionHeader 
            title={title}
            icon={Icon}
            tooltip={tooltip}
          />
          <IconButton size="small">
            {isExpanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
      </Box>

      <Collapse in={isExpanded} timeout="auto">
        <Box sx={{ mt: 2 }}>
          {children}
        </Box>
      </Collapse>
    </AnimatedSectionContainer>
  );
};

// Add scroll animation hook
const useScrollAnimation = (threshold = 0.2) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold,
        rootMargin: '50px',
      }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold]);

  return [ref, isVisible] as const;
};

// Add type for the selected stat
type SelectedStat = keyof PlayerStats;

// Add optimized chart component
const OptimizedChart: React.FC<{
  data: TrendDataPoint[];
  player1Name: string;
  player2Name: string;
  selectedStat: string;
  theme: Theme;
}> = ({ data, player1Name, player2Name, theme }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Legend />
        <Line
          type="monotone"
          dataKey="player1Value"
          name={player1Name}
          stroke={theme.palette.primary.main}
          strokeWidth={2}
          dot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="player2Value"
          name={player2Name}
          stroke={theme.palette.secondary.main}
          strokeWidth={2}
          dot={{ r: 4 }}
        />
        <Area
          type="monotone"
          dataKey="player1Trend"
          name={`${player1Name} Trend`}
          fill={theme.palette.primary.light}
          stroke={theme.palette.primary.dark}
          fillOpacity={0.3}
        />
        <Area
          type="monotone"
          dataKey="player2Trend"
          name={`${player2Name} Trend`}
          fill={theme.palette.secondary.light}
          stroke={theme.palette.secondary.dark}
          fillOpacity={0.3}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

OptimizedChart.displayName = 'OptimizedChart';

// Update section container with scroll animation
const AnimatedSectionContainer: React.FC<SectionContainerProps> = ({ children, ...props }) => {
  const [ref, isVisible] = useScrollAnimation();

  return (
    <Box 
      ref={ref}
      sx={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(50px)',
        transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <SectionContainer {...props}>
        {children}
      </SectionContainer>
    </Box>
  );
};


// Add these interfaces at the top of the file

interface ChartLoadingOverlayProps {
  isLoading: boolean;
}

interface SectionHeaderProps {
  title: string;
  icon: React.ElementType;
  tooltip?: string;
  isActive?: boolean;
}

interface SectionContainerProps {
  children: React.ReactNode;
  elevation?: number;
  isActive?: boolean;
}


// Add SectionContainer component
const SectionContainer: React.FC<SectionContainerProps> = ({
  children,
  elevation = 0,
  isActive = false
}) => (
  <Paper
    elevation={elevation}
    sx={{
      p: 3,
      bgcolor: 'background.default',
      borderRadius: 2,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: isActive ? 'scale(1.01)' : 'scale(1)',
      '&:hover': {
        bgcolor: 'background.paper',
        transform: 'scale(1.01)',
        boxShadow: theme => theme.shadows[elevation + 2]
      },
      animation: `${keyframes.fadeSlideIn} 0.5s ease-out`
    }}
  >
    {children}
  </Paper>
);

// Add SectionHeader component
const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  icon: Icon,
  tooltip,
  isActive = false
}) => (
  <Box sx={{ 
    display: 'flex', 
    alignItems: 'center', 
    mb: 3,
    pb: 1,
    borderBottom: 1,
    borderColor: 'divider'
  }}>
    <Icon sx={{ 
      mr: 1, 
      color: 'primary.main',
      animation: isActive ? `${keyframes.pulse} 2s infinite` : 'none'
    }} />
    <Typography variant="h6" component="h2">
      {title}
    </Typography>
    {tooltip && (
      <Tooltip title={tooltip}>
        <IconButton size="small" sx={{ ml: 1 }}>
          <Info fontSize="small" />
        </IconButton>
      </Tooltip>
    )}
  </Box>
);

// Add loading state components
const LoadingOverlay: React.FC<{
  isLoading: boolean;
}> = ({ isLoading }) => {
  if (!isLoading) return null;
  
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        zIndex: 10,
      }}
    >
      <CircularProgress />
    </Box>
  );
};

// Add error state component
const ErrorMessage: React.FC<{
  error: string;
  onRetry: () => void;
}> = ({ error, onRetry }) => {
  return (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <Typography variant="h6" color="error" gutterBottom>
        {error}
      </Typography>
      <Button
        variant="contained"
        startIcon={<Refresh />}
        onClick={onRetry}
        sx={{ mt: 2 }}
      >
        Retry
      </Button>
    </Box>
  );
};

// Add these types at the top
interface TrendDataPoint {
  season: Season;
  [key: string]: number | Season;
}


// Add error types
interface DataError extends Error {
  code?: string;
  details?: string;
}

// Add loading state types
interface LoadingState {
  isLoading: boolean;
  error: DataError | null;
  retry: () => void;
}

// Add this hook for data loading
const useDataLoader = (callback: () => Promise<void>): LoadingState => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<DataError | null>(null);

  const retry = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await callback();
    } catch (err) {
      const dataError: DataError = err instanceof Error ? err : new Error('Unknown error');
      setError(dataError);
    } finally {
      setIsLoading(false);
    }
  }, [callback]);

  useEffect(() => {
    retry();
  }, [retry]);

  return { isLoading, error, retry };
};










// Main component with proper initialization
const PlayerMatchupHistory: React.FC<PlayerMatchupHistoryProps> = ({
  player1Name,
  player2Name,
  matchupHistory,
}) => {
  // All hooks at the top level
  const theme = useTheme();
  const [selectedStat, setSelectedStat] = useState<SelectedStat>('playerEfficiencyRating');
  const [selectedCategory, setSelectedCategory] = useState('basic');
  const [isVisible] = useState(false);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [isMatchupsLoading, setIsMatchupsLoading] = useState(true);
  const [visibleSeasons, setVisibleSeasons] = useState(INITIAL_LOAD_COUNT);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [trendData] = useState<TrendDataPoint[]>([]);

  // Consolidate loading and error states
  const [isInitialLoading] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Rename the destructured error to dataError to avoid conflict
  const { isLoading: isDataLoading, error: dataError, retry } = useDataLoader(async () => {
    // Add data loading logic here
  });

  // Add error boundary for chart rendering
  const renderChart = useCallback(() => {
    try {
      return (
        <OptimizedChart
          data={trendData}
          player1Name={player1Name}
          player2Name={player2Name}
          selectedStat={selectedStat}
          theme={theme}
        />
      );
    } catch (err) {
      console.error('Chart rendering error:', err);
      return (
        <ErrorMessage 
          error="Failed to render chart" 
          onRetry={retry}
        />
      );
    }
  }, [trendData, player1Name, player2Name, selectedStat, theme, retry]);

  // Add the handleLoadMore function
  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleSeasons(prev => Math.min(prev + LOAD_MORE_COUNT, matchupHistory.length));
      setIsLoadingMore(false);
    }, 500);
  };

  return (
    <Paper sx={{ p: 4, mt: 3, position: 'relative' }}>
      <LoadingOverlay isLoading={isInitialLoading || isDataLoading} />
      
      {dataError ? (
        <ErrorMessage error={dataError.message} onRetry={retry} />
      ) : (
        <Paper sx={{ p: 4, mt: 3 }}>
          <Box sx={{ mb: 4 }}>
            <SectionHeader 
              title="Head-to-Head History"
              icon={CompareArrows}
              tooltip="Shows direct matchups and season performance trends"
            />
          </Box>

          {/* Performance Trends Section */}
          <Box sx={{ position: 'relative' }}>
            <ChartLoadingOverlay isLoading={isChartLoading} />
            <TransitionBox in={isVisible} direction="right" delay={STAGGER_DELAY}>
              <CollapsibleSection
                title="Performance Trends"
                icon={Timeline}
                tooltip="Compare season-by-season performance metrics"
                onToggle={(expanded) => {
                  if (expanded) {
                    setIsChartLoading(true);
                    setTimeout(() => setIsChartLoading(false), 500);
                  }
                }}
              >
                <Box sx={{ height: 400 }}>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: 2,
                    mb: 2 
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1">Performance Trends</Typography>
                      <ToggleButtonGroup
                        value={selectedCategory}
                        exclusive
                        onChange={(_, newCategory) => newCategory && setSelectedCategory(newCategory)}
                        size="small"
                      >
                        {statCategories.map(category => (
                          <ToggleButton 
                            key={category.id} 
                            value={category.id}
                          >
                            {category.label}
                          </ToggleButton>
                        ))}
                      </ToggleButtonGroup>
                    </Box>
                    
                    <ToggleButtonGroup
                      value={selectedStat}
                      exclusive
                      onChange={(_, newStat) => newStat && setSelectedStat(newStat as SelectedStat)}
                      size="small"
                    >
                      {trendStats
                        .filter(stat => stat.category === selectedCategory)
                        .map(stat => (
                          <ToggleButton 
                            key={stat.key} 
                            value={stat.key}
                            sx={{ 
                              px: 2,
                              '&.Mui-selected': {
                                bgcolor: `${stat.color}.main`,
                                color: 'white',
                                '&:hover': {
                                  bgcolor: `${stat.color}.dark`,
                                }
                              }
                            }}
                          >
                            {stat.label}
                          </ToggleButton>
                        ))}
                    </ToggleButtonGroup>
                  </Box>
                  <ResponsiveContainer width="100%" height="100%">
                    {renderChart()}
                  </ResponsiveContainer>

                  {/* Progressive loading indicator */}
                  {visibleSeasons < trendData.length && (
                    <Box 
                      ref={loadMoreRef}
                      sx={{ 
                        mt: 2, 
                        textAlign: 'center',
                        opacity: isLoadingMore ? 0.7 : 1,
                        transition: 'opacity 0.2s'
                      }}
                    >
                      {isLoadingMore ? (
                        <CircularProgress size={24} />
                      ) : (
                        <Button
                          variant="text"
                          onClick={handleLoadMore}
                          startIcon={<ExpandMore />}
                        >
                          Load More Seasons
                        </Button>
                      )}
                    </Box>
                  )}
                </Box>
              </CollapsibleSection>
            </TransitionBox>
          </Box>

          {/* Add a divider between sections */}
          <Box 
            sx={{ 
              my: 4,
              borderTop: 2,
              borderColor: 'divider',
              opacity: 0.7
            }} 
          />

          {/* Head-to-Head Matchups Section */}
          <Box sx={{ position: 'relative' }}>
            <ChartLoadingOverlay isLoading={isMatchupsLoading} />
            <TransitionBox in={isVisible} direction="left" delay={STAGGER_DELAY * 2}>
              <CollapsibleSection
                title="Recent Matchups"
                icon={EmojiEvents}
                tooltip="Head-to-head game results and performance"
                onToggle={(expanded) => {
                  if (expanded) {
                    setIsMatchupsLoading(true);
                    setTimeout(() => setIsMatchupsLoading(false), 500);
                  }
                }}
              >
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={matchupHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Legend />
                      <Bar
                        dataKey="player1Score"
                        name={player1Name}
                        fill={theme.palette.primary.main}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="player2Score"
                        name={player2Name}
                        fill={theme.palette.secondary.main}
                        radius={[4, 4, 0, 0]}
                      />
                      <Line
                        type="monotone"
                        dataKey="player1Efficiency"
                        stroke={theme.palette.primary.dark}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="player2Efficiency"
                        stroke={theme.palette.secondary.dark}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </Box>
              </CollapsibleSection>
            </TransitionBox>
          </Box>
        </Paper>
      )}
    </Paper>
  );
};

// Update the export to use error handling
export default withErrorHandling(PlayerMatchupHistoryWithErrorBoundary, (error) => {
  console.error('PlayerMatchupHistory error:', error);
});

// Define the missing interfaces
interface TrendStat {
  key: string;
  label: string;
  category?: string;
  format?: string;
  color?: string;
  suffix?: string;
  description?: string;
  calculate?: (stats: PlayerStats, allStats?: Record<Season, PlayerStats>) => number;
}

interface StatCategory {
  id: string;
  label: string;
  color: string;
}


// Fix the withErrorHandling HOC
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withErrorHandling(Component: React.ComponentType<any>, errorHandler: (error: Error) => void) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (props: any) => {
    try {
      return <Component {...props} />;
    } catch (error) {
      errorHandler(error as Error);
      return (
        <ErrorMessage
          error="An unexpected error occurred"
          onRetry={() => window.location.reload()}
        />
      );
    }
  };
}