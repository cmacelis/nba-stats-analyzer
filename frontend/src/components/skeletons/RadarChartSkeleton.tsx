import React from 'react';
import { Box, Paper, Skeleton, Typography } from '@mui/material';
import { TransitionComponent } from '../common/TransitionComponent';

export const RadarChartSkeleton: React.FC = () => {
  return (
    <TransitionComponent>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Performance Comparison
        </Typography>
        <Box sx={{ height: 400, position: 'relative' }}>
          <Skeleton variant="circular" width={300} height={300} sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
          
          {/* Create points around the radar chart */}
          {[...Array(5)].map((_, i) => (
            <Skeleton 
              key={i}
              variant="circular" 
              width={20} 
              height={20} 
              sx={{
                position: 'absolute',
                top: `${30 + Math.random() * 40}%`,
                left: `${30 + Math.random() * 40}%`
              }}
            />
          ))}
        </Box>
      </Paper>
    </TransitionComponent>
  );
}; 