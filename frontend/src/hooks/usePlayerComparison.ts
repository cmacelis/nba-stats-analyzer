import { useQuery } from '@tanstack/react-query';
import { Player, PlayerStats } from '../types/player';
import { getPlayerStats } from '../services/nbaApiService';
import { mapApiStatsToPlayerStats } from '../utils/dataMappers';

interface PlayerComparisonResult {
  player1Stats: PlayerStats | undefined;
  player2Stats: PlayerStats | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function usePlayerComparison(
  player1: Player | null,
  player2: Player | null,
  season: string = '2023'
): PlayerComparisonResult {
  const player1Query = useQuery({
    queryKey: ['playerStats', player1?.id, season],
    queryFn: async () => {
      if (!player1) return undefined;
      const stats = await getPlayerStats(player1.id, season);
      return mapApiStatsToPlayerStats(stats);
    },
    enabled: !!player1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const player2Query = useQuery({
    queryKey: ['playerStats', player2?.id, season],
    queryFn: async () => {
      if (!player2) return undefined;
      const stats = await getPlayerStats(player2.id, season);
      return mapApiStatsToPlayerStats(stats);
    },
    enabled: !!player2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    player1Stats: player1Query.data,
    player2Stats: player2Query.data,
    isLoading: player1Query.isLoading || player2Query.isLoading,
    error: player1Query.error || player2Query.error,
  };
} 