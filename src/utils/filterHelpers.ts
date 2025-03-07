import { Player } from '../types/nba';

export const isInConference = (team: string, conference: string): boolean => {
  const eastTeams = ['BOS', 'BKN', 'NYK', 'PHI', 'TOR', 'CHI', 'CLE', 'DET', 'IND', 'MIL', 'ATL', 'CHA', 'MIA', 'ORL', 'WAS'];
  const westTeams = ['DEN', 'MIN', 'OKC', 'POR', 'UTA', 'GSW', 'LAC', 'LAL', 'PHX', 'SAC', 'DAL', 'HOU', 'MEM', 'NOP', 'SAS'];
  
  if (conference === 'East') return eastTeams.includes(team);
  if (conference === 'West') return westTeams.includes(team);
  return true;
};

export const matchesExperience = (player: Player, experience: string): boolean => {
  const yearsInLeague = calculateYearsInLeague(player.stats?.season || '');
  
  switch (experience) {
    case 'rookie':
      return yearsInLeague <= 1;
    case 'veteran':
      return yearsInLeague > 3;
    default:
      return true;
  }
};

const calculateYearsInLeague = (currentSeason: string): number => {
  const [startYear] = currentSeason.split('-').map(Number);
  const rookieYear = calculateRookieYear(startYear);
  return startYear - rookieYear;
};

const calculateRookieYear = (currentYear: number): number => {
  // This is a simplified version. In a real app, you'd fetch this from an API
  const ROOKIE_YEARS: Record<string, number> = {
    'LeBron James': 2003,
    'Stephen Curry': 2009,
    'Kevin Durant': 2007,
    // Add more players as needed
  };
  
  return ROOKIE_YEARS[currentYear] || currentYear - 1; // Default to 1 year experience
}; 