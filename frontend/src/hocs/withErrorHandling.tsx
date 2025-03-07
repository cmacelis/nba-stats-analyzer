import React from 'react';
import { Alert, Box, Button } from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { LoadingOverlay } from '../components/common/LoadingOverlay';

interface WithErrorHandlingProps {
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export const withErrorHandling = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorHandler?: (error: Error) => void
) => {
  return function WithErrorHandlingComponent(
    props: P & WithErrorHandlingProps
  ) {
    const { isLoading, error, onRetry, ...componentProps } = props;

    if (error) {
      errorHandler?.(error);
      return (
        <Box sx={{ p: 2 }}>
          <Alert 
            severity="error"
            action={
              onRetry && (
                <Button
                  color="inherit"
                  size="small"
                  startIcon={<Refresh />}
                  onClick={onRetry}
                >
                  Retry
                </Button>
              )
            }
          >
            {error.message || 'An error occurred. Please try again.'}
          </Alert>
        </Box>
      );
    }

    return (
      <Box sx={{ position: 'relative' }}>
        {isLoading && <LoadingOverlay />}
        <WrappedComponent {...(componentProps as P)} />
      </Box>
    );
  };
}; 