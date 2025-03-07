export const config = {
  appName: 'NBA Stats Analyzer',
  version: '1.0.0',
  nbaApiBaseUrl: 'https://www.balldontlie.io/api/v1',
  nbaApiKey: process.env.REACT_APP_NBA_API_KEY || '',
  enableSounds: true,
  defaultTheme: 'light',
  cacheExpiration: 60 * 60 * 1000, // 1 hour in milliseconds
  maxRecentComparisons: 5,
  maxFavoriteComparisons: 10,
  defaultSeason: '2023-24',
  enableAnalytics: process.env.NODE_ENV === 'production',
  debugMode: process.env.NODE_ENV === 'development'
}; 