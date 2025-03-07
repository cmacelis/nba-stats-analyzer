import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { 
  getAllPlayers, 
  getPlayerById, 
  getPlayerStats, 
  getPlayerSeasonStats,
  searchPlayers,
  BallDontLiePlayer,
  BallDontLieStats,
  BallDontLieResponse
} from '../services/nbaApiService';
import { mapApiPlayerToPlayer, mapApiStatsToPlayerStats } from '../utils/dataMappers';
import { Player, PlayerStats } from '../types/player';

export function useAllPlayers(page = 1, perPage = 100) {
  return useQuery({
    queryKey: ['allPlayers', page, perPage],
    queryFn: () => getAllPlayers(page, perPage),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

export function usePlayerById(playerId: number | undefined) {
  return useQuery({
    queryKey: ['player', playerId],
    queryFn: () => getPlayerById(playerId!).then(mapApiPlayerToPlayer),
    enabled: !!playerId,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

export function usePlayerStats(playerId: number | undefined, season?: string) {
  return useQuery({
    queryKey: ['playerStats', playerId, season],
    queryFn: async () => {
      const response = await getPlayerStats(playerId!, season);
      if (response.data.length === 0) {
        throw new Error('No stats found for this player and season');
      }
      return mapApiStatsToPlayerStats(response.data[0]);
    },
    enabled: !!playerId,
    staleTime: 6 * 60 * 60 * 1000, // 6 hours
  });
}

export function usePlayerSeasonStats(playerId: number | undefined) {
  return useQuery({
    queryKey: ['playerSeasonStats', playerId],
    queryFn: async () => {
      const stats = await getPlayerSeasonStats(playerId!);
      return stats.map(mapApiStatsToPlayerStats);
    },
    enabled: !!playerId,
    staleTime: 6 * 60 * 60 * 1000, // 6 hours
  });
}

export function useSearchPlayers(query: string, page = 1, perPage = 25) {
  return useQuery({
    queryKey: ['searchPlayers', query, page, perPage],
    queryFn: () => searchPlayers(query, page, perPage),
    enabled: query.length >= 2, // Only search if query is at least 2 characters
    staleTime: 1 * 60 * 60 * 1000, // 1 hour
  });
} 