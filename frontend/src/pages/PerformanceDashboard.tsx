import React from 'react';
import { Box, Container, Paper, Typography } from '@mui/material';
import { PerformanceMetrics } from '../components/performance/PerformanceMetrics';
import { AnimatedElement } from '../components/common/AnimatedElement';

const PerformanceDashboard: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <AnimatedElement animation="fadeIn">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" gutterBottom>
            Performance Dashboard
          </Typography>
          
          <Paper sx={{ p: 3, mb: 4 }}>
            <PerformanceMetrics />
          </Paper>
        </Box>
      </AnimatedElement>
    </Container>
  );
};

export default PerformanceDashboard; 