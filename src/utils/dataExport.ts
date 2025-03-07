import type { Player, PlayerStats } from '../types/nba';

interface ExportOptions {
  format: 'csv' | 'json';
  includeAdvancedStats?: boolean;
}

export const exportPlayerData = (
  player: Player, 
  stats: PlayerStats[], 
  options: ExportOptions
): void => {
  const filename = `${player.fullName.toLowerCase().replace(/\s+/g, '-')}-stats`;
  
  if (options.format === 'csv') {
    const csvContent = convertToCSV(stats, options.includeAdvancedStats);
    downloadFile(`${filename}.csv`, csvContent, 'text/csv');
  } else {
    const jsonContent = JSON.stringify({ player, stats }, null, 2);
    downloadFile(`${filename}.json`, jsonContent, 'application/json');
  }
};

const downloadFile = (filename: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const convertToCSV = (stats: PlayerStats[], includeAdvancedStats?: boolean): string => {
  // Define headers based on stats properties
  const headers = [
    'season',
    'points',
    'assists',
    'rebounds',
    'steals',
    'blocks',
    ...(includeAdvancedStats ? ['per', 'trueShootingPercentage', 'winShares'] : [])
  ];

  // Create CSV header row
  const csvRows = [headers.join(',')];

  // Add data rows
  stats.forEach(stat => {
    const row = headers.map(header => stat[header as keyof PlayerStats] ?? '');
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}; 