import { StatConfig } from '../types/stats';

export const formatStat = (value: number | undefined | null, precision: number = 1): string => {
  if (value === undefined || value === null) {
    return '-';
  }
  return value.toFixed(precision);
};

export const formatStatPercentage = (value: number | undefined | null): string => {
  if (value === undefined || value === null) {
    return '-';
  }
  return `${value.toFixed(1)}%`;
};

export const formatStatConfig = (value: number, format: StatConfig['format']): string => {
  switch (format) {
    case '0': return value.toFixed(0);
    case '0.0': return value.toFixed(1);
    case '0.00': return value.toFixed(2);
    default: return value.toString();
  }
};

/**
 * Formats a metric value based on its type and magnitude
 */
export function formatMetric(value: number, precision: number = 2): string {
  // Handle undefined/null values
  if (value == null) return 'N/A';

  // Handle zero
  if (value === 0) return '0';

  // Handle small numbers (less than 0.01)
  if (Math.abs(value) < 0.01) {
    return value.toExponential(precision);
  }

  // Handle large numbers (greater than 1 million)
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(precision)}M`;
  }

  // Handle thousands
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(precision)}K`;
  }

  // Handle regular numbers
  return value.toFixed(precision);
}

/**
 * Formats a percentage value with more advanced features
 */
export function formatPercentage(value: number, precision: number = 1): string {
  if (value == null) return 'N/A';
  return `${(value * 100).toFixed(precision)}%`;
}

/**
 * Formats a time duration in milliseconds
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Formats a file size in bytes
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)}${units[unitIndex]}`;
}

/**
 * Formats a date to a readable string
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

export function formatNumber(value: number, format: string): string {
  if (format.includes('%')) {
    return `${value.toFixed(1)}%`;
  }
  
  const precision = parseInt(format.split('.')[1] || '0');
  return value.toFixed(precision);
} 