import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

// Empty in dev — Vite proxy routes /api/* to localhost:3000.
// In production set VITE_API_BASE_URL to the Heroku backend origin (no trailing slash, no /api).
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
});

/**
 * Hook for searching players
 */
export const useSearchPlayers = (searchTerm: string, page: number = 1, perPage: number = 25) => {
  return useQuery({
    queryKey: ['players', 'search', searchTerm, page],
    queryFn: async () => {
      // If the search term is too short, don't waste an API call
      if (searchTerm.length < 2) return { data: [], meta: { total_pages: 0 } };
      
      const response = await api.get('/api/players', {
        params: { search: searchTerm, page, per_page: perPage }
      });
      return response.data;
    },
    enabled: searchTerm.length >= 2, // Only run when there's a real search
  });
};

/**
 * Hook for player comparison (Head-to-Head)
 */
export const usePlayerComparison = (id1: string, id2: string, season: number = 2024) => {
  return useQuery({
    queryKey: ['players', 'compare', id1, id2, season],
    queryFn: async () => {
      const response = await api.get(`/api/players/compare/${id1}/${id2}`, {
        params: { season },
      });
      // Returns { player1: {}, player2: {}, head_to_head: [] }
      return response.data;
    },
    // Only fetch if BOTH IDs are present to prevent 404/400 errors
    enabled: !!id1 && !!id2,
  });
};

/**
 * Hook for individual player stats
 */
export const usePlayerStats = (playerId: string, season: number = 2025) => {
  return useQuery({
    queryKey: ['players', 'stats', playerId, season],
    queryFn: async () => {
      const response = await api.get(`/api/players/${playerId}/stats`, {
        params: { season },
      });
      return response.data;
    },
    enabled: !!playerId,
  });
};

export interface NbaGame {
  id: number;
  date: string;
  status: string;
  season: number;
  home_team: { id: number; name: string; full_name: string; abbreviation: string };
  visitor_team: { id: number; name: string; full_name: string; abbreviation: string };
  home_team_score: number;
  visitor_team_score: number;
}

/**
 * Hook for resolving a player photo URL by name (for players without photoUrl in their Player object)
 */
export const usePlayerPhoto = (playerName: string) => {
  return useQuery<string | null>({
    queryKey: ['players', 'photo', playerName],
    queryFn: async () => {
      const response = await api.get('/api/players/photo', { params: { name: playerName } });
      return response.data.photo_url ?? null;
    },
    enabled: !!playerName,
    staleTime: 24 * 60 * 60 * 1000,
  });
};

const FALLBACK_SEASONS = [2025, 2024, 2023, 2022, 2021];

/**
 * Like usePlayerStats but automatically falls back to season-1 if the selected
 * season returns no data (pts === undefined/0). Returns isFallback and effectiveSeason
 * so the UI can show an info banner when the fallback kicks in.
 */
export const usePlayerStatsWithFallback = (playerId: string, season: number = 2025) => {
  const primary = usePlayerStats(playerId, season);
  const hasNoData = !primary.isLoading && !primary.isError && primary.data !== undefined && !primary.data?.pts;
  const prevSeason = season - 1;
  const canFallback = hasNoData && FALLBACK_SEASONS.includes(prevSeason);
  // Always call the hook (Rules of Hooks) — disable it when not needed via empty playerId
  const fallback = usePlayerStats(canFallback ? playerId : '', prevSeason);
  const isFallback = canFallback && !fallback.isLoading && !!fallback.data?.pts;

  return {
    data: isFallback ? fallback.data : primary.data,
    isLoading: primary.isLoading || (canFallback && fallback.isLoading),
    isError: primary.isError,
    isFallback,
    effectiveSeason: isFallback ? prevSeason : season,
  };
};

/**
 * Hook for upcoming games (today + next 3 days, non-Final)
 */
export const useUpcomingGames = () => {
  return useQuery<NbaGame[]>({
    queryKey: ['games', 'upcoming'],
    queryFn: async () => {
      const response = await api.get('/api/games');
      return response.data.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
};