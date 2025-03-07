import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import { formatStatPercentage, formatMetric } from '../utils/formatUtils';
import { TrendIndicator } from './TrendIndicator';

interface StatComparisonRowProps {
  label: string;
  value1: number;
  value2: number;
  isPercentage?: boolean;
  higherIsBetter?: boolean;
  previousValue1?: number;
  previousValue2?: number;
}

export const StatComparisonRow: React.FC<StatComparisonRowProps> = ({
  label,
  value1,
  value2,
  isPercentage = false,
  higherIsBetter = true,
  previousValue1,
  previousValue2,
}) => {
  const total = Math.abs(value1) + Math.abs(value2);
  const percentage1 = (Math.abs(value1) / total) * 100;
  const isBetter1 = higherIsBetter ? value1 > value2 : value1 < value2;
  const color1 = isBetter1 ? 'success.main' : 'error.main';
  const color2 = !isBetter1 ? 'success.main' : 'error.main';

  const formatValue = (value: number) => 
    isPercentage ? formatStatPercentage(value) : formatMetric(value, 1);

  return (
    <Box sx={{ my: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">
          {label}
        </Typography>
        {previousValue1 && previousValue2 && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TrendIndicator
              current={value1}
              previous={previousValue1}
              higherIsBetter={higherIsBetter}
            />
            <TrendIndicator
              current={value2}
              previous={previousValue2}
              higherIsBetter={higherIsBetter}
            />
          </Box>
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography sx={{ color: color1, width: 60 }}>
          {formatValue(value1)}
        </Typography>
        <Box sx={{ flexGrow: 1 }}>
          <LinearProgress
            variant="determinate"
            value={percentage1}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: (theme) => theme.palette.grey[200],
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                backgroundColor: color1,
              },
            }}
          />
        </Box>
        <Typography sx={{ color: color2, width: 60, textAlign: 'right' }}>
          {formatValue(value2)}
        </Typography>
      </Box>
    </Box>
  );
}; 