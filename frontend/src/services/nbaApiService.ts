import axios from 'axios';

// All requests go through /api/* which Vite proxies to the backend in dev,
// and Vercel routes to the serverless function in production.
const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Retry once after a 30-second back-off on rate limit responses
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 429) {
      console.warn('NBA API rate limit reached. Retrying in 30 seconds...');
      return new Promise(resolve => {
        setTimeout(() => resolve(api(error.config)), 30000);
      });
    }
    return Promise.reject(error);
  }
);

export interface BallDontLiePlayer {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
  height_feet: number | null;
  height_inches: number | null;
  weight_pounds: number | null;
  team: {
    id: number;
    abbreviation: string;
    city: string;
    conference: string;
    division: string;
    full_name: string;
    name: string;
  };
}

export interface BallDontLieStats {
  games_played: number;
  player_id: number;
  season: number;
  min: string;
  fgm: number;
  fga: number;
  fg3m: number;
  fg3a: number;
  ftm: number;
  fta: number;
  oreb: number;
  dreb: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  turnover: number;
  pf: number;
  pts: number;
  fg_pct: number;
  fg3_pct: number;
  ft_pct: number;
}

export interface BallDontLieResponse<T> {
  data: T[];
  meta: {
    total_pages: number;
    current_page: number;
    next_page: number | null;
    per_page: number;
    total_count: number;
  };
}

export async function getAllPlayers(page = 1, perPage = 100): Promise<BallDontLieResponse<BallDontLiePlayer>> {
  const response = await api.get('/api/players', {
    params: { page, per_page: perPage }
  });
  return response.data;
}

export async function getPlayerById(id: number): Promise<BallDontLiePlayer> {
  const response = await api.get(`/api/players/${id}`);
  return response.data;
}

export async function getPlayerStats(playerId: number, season: string = '2024-25') {
  try {
    // BallDontLie uses the start year of the season (e.g. "2024" for 2024-25)
    const seasonYear = season.split('-')[0];
    const response = await api.get(`/api/players/${playerId}/stats`, {
      params: { season: seasonYear }
    });
    return response.data || null;
  } catch (error) {
    console.error(`Error fetching stats for player ${playerId}:`, error);
    throw error;
  }
}

export async function getPlayerSeasonStats(playerId: number) {
  try {
    const currentYear = new Date().getFullYear();
    const seasons = [];

    for (let i = 0; i < 5; i++) {
      const year = currentYear - i;
      const seasonYear = `${year - 1}-${year.toString().slice(-2)}`;
      const seasonData = await getPlayerStats(playerId, seasonYear);

      if (seasonData) {
        seasons.push({
          ...seasonData,
          season: seasonYear
        });
      }
    }

    return seasons;
  } catch (error) {
    console.error(`Error fetching season stats for player ${playerId}:`, error);
    throw error;
  }
}

export async function searchPlayers(query: string, page = 1, perPage = 25): Promise<BallDontLieResponse<BallDontLiePlayer>> {
  try {
    const response = await api.get('/api/players', {
      params: { search: query, page, per_page: perPage }
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        console.error('🔒 Unauthorized: API key rejected by balldontlie.');
      } else if (error.response?.status === 429) {
        console.error('⏳ Rate Limited: Too many requests. Wait a moment.');
      } else {
        console.error('🌐 Network Error:', error.message);
      }
    }
    throw error;
  }
}

export async function getHeadToHeadMatchups(_player1Id: number, _player2Id: number) {
  // BallDontLie doesn't have a head-to-head endpoint; return mock data
  return [
    {
      id: 1,
      date: '2023-12-25T20:00:00Z',
      home_team_id: 1,
      home_team_score: 110,
      visitor_team_id: 2,
      visitor_team_score: 105,
      player1_stats: { points: 28, assists: 7, rebounds: 8 },
      player2_stats: { points: 22, assists: 5, rebounds: 4 },
      season: '2023-24',
      status: 'Final',
      period: 4,
      time: '',
      postseason: false
    },
    {
      id: 2,
      date: '2023-11-15T19:30:00Z',
      home_team_id: 2,
      home_team_score: 118,
      visitor_team_id: 1,
      visitor_team_score: 112,
      player1_stats: { points: 32, assists: 5, rebounds: 6 },
      player2_stats: { points: 25, assists: 8, rebounds: 5 },
      season: '2023-24',
      status: 'Final',
      period: 4,
      time: '',
      postseason: false
    },
    {
      id: 3,
      date: '2023-10-24T18:00:00Z',
      home_team_id: 1,
      home_team_score: 102,
      visitor_team_id: 2,
      visitor_team_score: 108,
      player1_stats: { points: 24, assists: 6, rebounds: 9 },
      player2_stats: { points: 30, assists: 4, rebounds: 7 },
      season: '2023-24',
      status: 'Final',
      period: 4,
      time: '',
      postseason: false
    }
  ];
}

export async function getPlayerDetails(playerId: number) {
  try {
    const response = await api.get(`/api/players/${playerId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching details for player ${playerId}:`, error);
    throw error;
  }
}
