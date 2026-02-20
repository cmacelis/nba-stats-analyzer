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


