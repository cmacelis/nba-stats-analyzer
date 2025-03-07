import React from 'react';
import { Box, Paper, Typography, Grid, CircularProgress } from '@mui/material';
import { Line } from 'react-chartjs-2';
import { usePerformance } from '../../contexts/PerformanceContext';
import { formatMetric, formatDuration } from '../../utils/formatUtils';
import { AnimatedElement } from '../common/AnimatedElement';
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface MetricCardProps {
  label: string;
  value: number;
  target: number;
  unit?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, target, unit = 'ms' }) => {
  const percentage = Math.min((value / target) * 100, 100);
  const color = percentage > 90 ? 'error' : percentage > 75 ? 'warning' : 'success';

  return (
    <AnimatedElement animation="fadeIn">
      <Paper sx={{ p: 2 }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress
            variant="determinate"
            value={percentage}
            color={color}
            size={60}
          />
          <Typography variant="h6" sx={{ mt: 1 }}>
            {unit === 'ms' ? formatDuration(value) : formatMetric(value)}{unit}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        </Box>
      </Paper>
    </AnimatedElement>
  );
};

export const PerformanceMetrics: React.FC = () => {
  const { metrics, history } = usePerformance();

  const chartData = {
    labels: history.map(h => new Date(h.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: 'FCP',
        data: history.map(h => h.FCP),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      },
      {
        label: 'LCP',
        data: history.map(h => h.LCP),
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1
      }
    ]
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Performance Metrics
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            label="First Contentful Paint"
            value={metrics.FCP}
            target={2000}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            label="Largest Contentful Paint"
            value={metrics.LCP}
            target={2500}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            label="Cumulative Layout Shift"
            value={metrics.CLS}
            target={0.1}
            unit=""
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            label="First Input Delay"
            value={metrics.FID}
            target={100}
          />
        </Grid>
      </Grid>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Performance Trends
        </Typography>
        <Box sx={{ height: 300 }}>
          <Line data={chartData} options={{
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Time (ms)'
                }
              }
            }
          }} />
        </Box>
      </Paper>
    </Box>
  );
}; 