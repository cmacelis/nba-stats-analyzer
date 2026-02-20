import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

// We use an empty string because the Vite proxy handles the /api prefix
const API_BASE_URL = '';

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
export const usePlayerStats = (playerId: string, season: number = 2024) => {
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