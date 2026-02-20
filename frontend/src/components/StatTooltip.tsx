import React from 'react';
import { Tooltip, Box, Typography } from '@mui/material';
import { formatStatPercentage } from '../utils/formatUtils';

interface StatTooltipProps {
  stat: string;
  value: number;
  description: string;
  leagueAverage?: number;
  children: React.ReactNode;
}

export const StatTooltip: React.FC<StatTooltipProps> = ({
  stat,
  value,
  description,
  leagueAverage,
  children
}) => {
  return (
    <Tooltip
      title={
        <Box sx={{ p: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            {stat}: {formatStatPercentage(value)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
          {leagueAverage && (
            <Typography variant="caption" color="text.secondary">
              League Average: {formatStatPercentage(leagueAverage)}
            </Typography>
          )}
        </Box>
      }
    >
      <span>{children}</span>
    </Tooltip>
  );
}; 