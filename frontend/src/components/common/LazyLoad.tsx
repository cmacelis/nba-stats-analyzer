import React, { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';

interface LazyLoadProps {
  children: React.ReactNode;
}

export const LazyLoad: React.FC<LazyLoadProps> = ({ children }) => {
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 200
          }}
        >
          <CircularProgress />
        </Box>
      }
    >
      {children}
    </Suspense>
  );
}; 