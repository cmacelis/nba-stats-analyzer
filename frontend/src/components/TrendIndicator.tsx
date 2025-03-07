import React from 'react';
import { Box, Tooltip } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';

interface TrendIndicatorProps {
  current: number;
  previous: number;
  threshold?: number;
  higherIsBetter?: boolean;
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({
  current,
  previous,
  threshold = 0.05, // 5% change threshold
  higherIsBetter = true,
}) => {
  const percentChange = ((current - previous) / previous) * 100;
  const isSignificant = Math.abs(percentChange) >= threshold * 100;
  
  if (!isSignificant) {
    return (
      <Tooltip title="No significant change">
        <TrendingFlatIcon color="action" fontSize="small" />
      </Tooltip>
    );
  }

  const isPositive = higherIsBetter ? percentChange > 0 : percentChange < 0;
  
  return (
    <Tooltip title={`${Math.abs(percentChange).toFixed(1)}% ${isPositive ? 'increase' : 'decrease'}`}>
      <Box component="span" sx={{ color: isPositive ? 'success.main' : 'error.main' }}>
        {isPositive ? (
          <TrendingUpIcon fontSize="small" />
        ) : (
          <TrendingDownIcon fontSize="small" />
        )}
      </Box>
    </Tooltip>
  );
}; 