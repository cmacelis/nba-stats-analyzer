import { QueryClient } from '@tanstack/react-query';
import { getPlayerById, getPlayerStats } from '../services/playerService';

export const prefetchPlayerData = async (
  queryClient: QueryClient,
  playerId: number,
  options = { staleTime: 5 * 60 * 1000 } // 5 minutes
): Promise<void> => {
  // Prefetch player details
  await queryClient.prefetchQuery({
    queryKey: ['player', playerId],
    queryFn: () => getPlayerById(playerId),
    staleTime: options.staleTime
  });
  
  // Prefetch player stats
  await queryClient.prefetchQuery({
    queryKey: ['playerStats', playerId],
    queryFn: () => getPlayerStats(playerId),
    staleTime: options.staleTime
  });
};

export const prefetchPopularPlayers = async (
  queryClient: QueryClient,
  playerIds: number[]
): Promise<void> => {
  const promises = playerIds.map(id => prefetchPlayerData(queryClient, id));
  await Promise.all(promises);
}; 