import React from 'react';
import { Box, Skeleton, Grid, Paper, Divider } from '@mui/material';

export const StatComparisonSkeleton: React.FC = () => {
  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      {/* Head to Head Section */}
      <Box>
        <Skeleton variant="text" width={200} height={32} />
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Skeleton variant="text" width={80} height={48} sx={{ mx: 'auto' }} />
              <Skeleton variant="text" width={120} height={24} sx={{ mx: 'auto' }} />
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Skeleton variant="text" width={80} height={48} sx={{ mx: 'auto' }} />
              <Skeleton variant="text" width={120} height={24} sx={{ mx: 'auto' }} />
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Skeleton variant="text" width={80} height={48} sx={{ mx: 'auto' }} />
              <Skeleton variant="text" width={120} height={24} sx={{ mx: 'auto' }} />
            </Paper>
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Season Stats Section */}
      <Box>
        <Skeleton variant="text" width={160} height={32} />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Box key={i} sx={{ my: 2 }}>
            <Skeleton variant="text" width={120} height={24} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
              <Skeleton variant="text" width={60} />
              <Skeleton variant="rectangular" height={8} sx={{ flexGrow: 1, borderRadius: 1 }} />
              <Skeleton variant="text" width={60} />
            </Box>
          </Box>
        ))}
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Last Matchup Section */}
      <Box>
        <Skeleton variant="text" width={140} height={32} />
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Skeleton variant="text" width={200} height={48} sx={{ mx: 'auto' }} />
          <Skeleton variant="text" width={160} height={24} sx={{ mx: 'auto', mt: 1 }} />
        </Box>
      </Box>
    </Paper>
  );
}; 