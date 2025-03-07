import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  ToggleButtonGroup, 
  ToggleButton,
  useTheme
} from '@mui/material';
import { Line } from 'react-chartjs-2';
import { Player, SeasonStatsData } from '../types/player';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface PlayerCareerTrendsProps {
  player1: Player;
  player2: Player;
  player1Seasons: SeasonStatsData[];
  player2Seasons: SeasonStatsData[];
}

type StatKey = 'points' | 'assists' | 'rebounds' | 'fieldGoalPercentage' | 'threePointPercentage';

const statOptions: { value: StatKey; label: string }[] = [
  { value: 'points', label: 'Points' },
  { value: 'assists', label: 'Assists' },
  { value: 'rebounds', label: 'Rebounds' },
  { value: 'fieldGoalPercentage', label: 'FG%' },
  { value: 'threePointPercentage', label: '3PT%' }
];

const PlayerCareerTrends: React.FC<PlayerCareerTrendsProps> = ({
  player1,
  player2,
  player1Seasons,
  player2Seasons
}) => {
  const theme = useTheme();
  const [selectedStat, setSelectedStat] = useState<StatKey>('points');
  
  const handleStatChange = (
    _event: React.MouseEvent<HTMLElement>,
    newStat: StatKey | null,
  ) => {
    if (newStat !== null) {
      setSelectedStat(newStat);
    }
  };
  
  // Sort seasons chronologically
  const sortedPlayer1Seasons = [...player1Seasons].sort((a, b) => a.season.localeCompare(b.season));
  const sortedPlayer2Seasons = [...player2Seasons].sort((a, b) => a.season.localeCompare(b.season));
  
  const chartData = {
    labels: sortedPlayer1Seasons.map(s => s.season),
    datasets: [
      {
        label: player1.name,
        data: sortedPlayer1Seasons.map(s => s[selectedStat]),
        borderColor: theme.palette.primary.main,
        backgroundColor: theme.palette.primary.main,
        fill: false,
        tension: 0.1
      },
      {
        label: player2.name,
        data: sortedPlayer2Seasons.map(s => s[selectedStat]),
        borderColor: theme.palette.secondary.main,
        backgroundColor: theme.palette.secondary.main,
        fill: false,
        tension: 0.1
      }
    ]
  };
  
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.raw;
            const statName = selectedStat;
            
            if (statName === 'fieldGoalPercentage' || statName === 'threePointPercentage') {
              return `${context.dataset.label}: ${value.toFixed(1)}%`;
            }
            
            return `${context.dataset.label}: ${value.toFixed(1)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: selectedStat !== 'fieldGoalPercentage' && selectedStat !== 'threePointPercentage'
      }
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Career Trends
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <ToggleButtonGroup
          value={selectedStat}
          exclusive
          onChange={handleStatChange}
          aria-label="stat selection"
          size="small"
        >
          {statOptions.map(option => (
            <ToggleButton key={option.value} value={option.value}>
              {option.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
      
      <Box sx={{ height: 400 }}>
        <Line data={chartData} options={chartOptions} />
      </Box>
    </Paper>
  );
};

export default PlayerCareerTrends; 