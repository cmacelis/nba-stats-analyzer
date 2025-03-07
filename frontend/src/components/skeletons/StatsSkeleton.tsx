import React from 'react';
import { Box, Paper, Skeleton, Grid } from '@mui/material';
import { TransitionComponent } from '../common/TransitionComponent';

export const StatsSkeleton: React.FC = () => {
  return (
    <TransitionComponent>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Skeleton variant="text" width={200} height={32} sx={{ mb: 3 }} />
        
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Box sx={{ mb: 2 }}>
                <Skeleton variant="text" width={120} height={24} />
                <Skeleton variant="text" width="100%" height={40} />
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </TransitionComponent>
  );
}; 