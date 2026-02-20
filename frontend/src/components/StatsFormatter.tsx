import React from 'react';
import { TableCell } from '@mui/material';
import { formatStat, formatPercentage } from '../utils/formatUtils';

interface StatsFormatterProps {
  stat: string;
  value: number | undefined | null;
  isPercentage?: boolean;
  precision?: number;
}

export const StatsFormatter: React.FC<StatsFormatterProps> = ({
  value,
  isPercentage = false,
  precision = 1
}) => {
  const formattedValue = isPercentage
    ? formatPercentage(value ?? 0)
    : formatStat(value, precision);

  return (
    <TableCell align="right">
      {formattedValue}
    </TableCell>
  );
}; 