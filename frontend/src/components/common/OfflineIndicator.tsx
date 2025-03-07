import React from 'react';
import { Snackbar, Alert, Box, Typography } from '@mui/material';
import { WifiOff } from '@mui/icons-material';
import { useOfflineDetection } from '../../hooks/useOfflineDetection';
import { AnimatedElement } from './AnimatedElement';

interface OfflineIndicatorProps {
  position?: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
  persistent?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  position = {
    vertical: 'bottom',
    horizontal: 'left'
  },
  persistent = false
}) => {
  const isOffline = useOfflineDetection();

  if (persistent) {
    return (
      <AnimatedElement
        animation="slideIn"
        sx={{
          position: 'fixed',
          ...position,
          m: 2,
          display: isOffline ? 'block' : 'none'
        }}
      >
        <Alert
          severity="warning"
          icon={<WifiOff />}
          sx={{
            alignItems: 'center',
            backgroundColor: 'warning.dark',
            color: 'warning.contrastText'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2">
              You're offline. Some features may be limited.
            </Typography>
          </Box>
        </Alert>
      </AnimatedElement>
    );
  }

  return (
    <Snackbar
      open={isOffline}
      anchorOrigin={position}
      sx={{ bottom: { xs: 90, sm: 24 } }}
    >
      <Alert
        severity="warning"
        icon={<WifiOff />}
        sx={{
          width: '100%',
          alignItems: 'center',
          backgroundColor: 'warning.dark',
          color: 'warning.contrastText'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="body2">
            You're offline. Using cached data.
          </Typography>
        </Box>
      </Alert>
    </Snackbar>
  );
}; 