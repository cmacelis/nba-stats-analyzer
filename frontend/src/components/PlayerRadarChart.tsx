import React, { useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  TooltipItem
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { Box, Paper, Typography, useTheme, Fade } from '@mui/material';
import { Player, PlayerStats } from '../types/player';
import { useSound } from '../contexts/SoundContext';
import { TransitionComponent } from './common/TransitionComponent';
import { LoadingOverlay } from './common/LoadingOverlay';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface PlayerRadarChartProps {
  player1: Player;
  player2: Player;
  stats1?: PlayerStats;
  stats2?: PlayerStats;
  isLoading?: boolean;
}

const statsToShow = [
  { key: 'points', label: 'Points', max: 35 },
  { key: 'assists', label: 'Assists', max: 12 },
  { key: 'rebounds', label: 'Rebounds', max: 15 },
  { key: 'steals', label: 'Steals', max: 3 },
  { key: 'blocks', label: 'Blocks', max: 3 },
  { key: 'playerEfficiencyRating', label: 'PER', max: 30 },
] as const;

export const PlayerRadarChart: React.FC<PlayerRadarChartProps> = ({
  player1,
  player2,
  stats1,
  stats2,
  isLoading = false
}) => {
  const theme = useTheme();
  const { playSound } = useSound();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    playSound('switch');
  }, [player1.id, player2.id, playSound]);

  const calculateChartData = useMemo(() => {
    if (!stats1 || !stats2) return null;
    return {
      labels: statsToShow.map(stat => stat.label),
      datasets: [
        {
          label: player1.name,
          data: statsToShow.map(stat => stats1[stat.key as keyof PlayerStats]),
          backgroundColor: `${theme.palette.primary.main}40`,
          borderColor: theme.palette.primary.main,
          borderWidth: 2,
          pointBackgroundColor: theme.palette.primary.main,
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: theme.palette.primary.main,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: player2.name,
          data: statsToShow.map(stat => stats2[stat.key as keyof PlayerStats]),
          backgroundColor: `${theme.palette.secondary.main}40`,
          borderColor: theme.palette.secondary.main,
          borderWidth: 2,
          pointBackgroundColor: theme.palette.secondary.main,
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: theme.palette.secondary.main,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  }, [player1, player2, stats1, stats2, theme.palette]);

  if (isLoading || !stats1 || !stats2) {
    return (
      <Paper sx={{ p: 3, mb: 3, position: 'relative', minHeight: 400 }}>
        <Typography variant="h6" gutterBottom>
          Performance Comparison
        </Typography>
        {isLoading ? (
          <LoadingOverlay message="Loading player stats..." />
        ) : (
          <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="text.secondary">
              Stats not available
            </Typography>
          </Box>
        )}
      </Paper>
    );
  }

  const data = calculateChartData!;

  const options = {
    scales: {
      r: {
        min: 0,
        max: Math.max(...statsToShow.map(stat => stat.max)),
        ticks: {
          stepSize: 5,
          callback: (value: number) => value.toFixed(0),
        },
        pointLabels: {
          font: {
            size: 12,
            weight: 'bold' as const,
          },
        },
        grid: {
          color: theme.palette.divider,
        },
        angleLines: {
          color: theme.palette.divider,
        },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: (context: TooltipItem<'radar'>) => {
            const value = context.raw as number;
            return `${context.dataset.label}: ${value.toFixed(1)}`;
          },
        },
      },
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart',
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <TransitionComponent>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Performance Comparison
        </Typography>
        <Fade in={isVisible} timeout={1000}>
          <Box sx={{ height: 400 }}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Radar data={data} options={options as any} />
          </Box>
        </Fade>
      </Paper>
    </TransitionComponent>
  );
};

export default PlayerRadarChart;