import React from 'react';
import { Box, Skeleton, Paper, Grid } from '@mui/material';
import { TransitionComponent } from '../common/TransitionComponent';

export const ComparisonSkeleton: React.FC = () => {
  return (
    <TransitionComponent>
      {/* Player Selection Skeletons */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={5}>
          <Skeleton variant="rectangular" height={56} />
        </Grid>
        <Grid item xs={12} md={2} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Skeleton variant="text" width={40} />
        </Grid>
        <Grid item xs={12} md={5}>
          <Skeleton variant="rectangular" height={56} />
        </Grid>
      </Grid>

      {/* Stats Comparison Skeleton */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Skeleton variant="text" width={200} height={32} sx={{ mb: 2 }} />
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} md={6} key={i}>
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="rectangular" height={100} sx={{ mt: 1 }} />
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Chart Skeleton */}
      <Paper sx={{ p: 3 }}>
        <Skeleton variant="text" width={160} height={32} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={300} />
      </Paper>
    </TransitionComponent>
  );
}; 