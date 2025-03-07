export interface NBATeam {
  id: string;
  name: string;
  abbreviation: string;
  logo: string;
  primaryColor: string;
  conference: 'Eastern' | 'Western';
  division: string;
}

export const NBA_TEAMS: NBATeam[] = [
  {
    id: 'atl',
    name: 'Atlanta Hawks',
    abbreviation: 'ATL',
    logo: '/team-logos/hawks.svg',
    primaryColor: '#E03A3E',
    conference: 'Eastern',
    division: 'Southeast'
  },
  {
    id: 'bos',
    name: 'Boston Celtics',
    abbreviation: 'BOS',
    logo: '/team-logos/celtics.svg',
    primaryColor: '#007A33',
    conference: 'Eastern',
    division: 'Atlantic'
  },
  // Add all NBA teams here...
  {
    id: 'gsw',
    name: 'Golden State Warriors',
    abbreviation: 'GSW',
    logo: '/team-logos/warriors.svg',
    primaryColor: '#1D428A',
    conference: 'Western',
    division: 'Pacific'
  },
  {
    id: 'lal',
    name: 'Los Angeles Lakers',
    abbreviation: 'LAL',
    logo: '/team-logos/lakers.svg',
    primaryColor: '#552583',
    conference: 'Western',
    division: 'Pacific'
  }
];

export const getTeamById = (id: string): NBATeam | undefined => {
  return NBA_TEAMS.find(team => team.id === id);
};

export const getTeamsByConference = (conference: 'Eastern' | 'Western'): NBATeam[] => {
  return NBA_TEAMS.filter(team => team.conference === conference);
};

export const getTeamsByDivision = (division: string): NBATeam[] => {
  return NBA_TEAMS.filter(team => team.division === division);
}; 