import React from 'react';
import { Box, Skeleton, Paper, Grid } from '@mui/material';
import { TransitionComponent } from './TransitionComponent';

const ComparisonSkeleton: React.FC = () => {
  return (
    <TransitionComponent>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
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
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Skeleton variant="text" width={200} height={32} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={400} />
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Skeleton variant="text" width={200} height={32} sx={{ mb: 2 }} />
        <Box sx={{ mb: 2 }}>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} variant="text" height={40} sx={{ my: 1 }} />
          ))}
        </Box>
      </Paper>
    </TransitionComponent>
  );
};

export default ComparisonSkeleton; 