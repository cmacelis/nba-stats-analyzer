import React, { useEffect, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';
import { apiClient } from '../../utils/apiClient';

export const ServerStatus: React.FC = () => {
  const [isServerDown, setIsServerDown] = useState(false);

  useEffect(() => {
    const checkServer = async () => {
      try {
        await apiClient.get('/api/health');
        setIsServerDown(false);
      } catch (error) {
        setIsServerDown(true);
      }
    };

    checkServer();
    const interval = setInterval(checkServer, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <Snackbar open={isServerDown} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
      <Alert severity="error">
        Server connection failed. Please check your connection or try again later.
      </Alert>
    </Snackbar>
  );
}; 