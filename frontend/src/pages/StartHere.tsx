import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * StartHere page - redirects to home with query params preserved.
 * This page exists to satisfy the spec requirement for Discord OAuth redirect.
 * In practice, it immediately redirects to the home page.
 */
const StartHere: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Redirect to home page, preserving any query parameters (e.g., discord=connected)
    const params = searchParams.toString();
    const target = params ? `/?${params}` : '/';
    navigate(target, { replace: true });
  }, [navigate, searchParams]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: 2,
      }}
    >
      <CircularProgress />
      <Typography variant="body1" color="text.secondary">
        Redirecting...
      </Typography>
    </Box>
  );
};

export default StartHere;