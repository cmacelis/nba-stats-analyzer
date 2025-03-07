import { useQuery } from '@tanstack/react-query';
import { Player, SeasonStatsData } from '../types/player';
import { getPlayerSeasonStats } from '../services/nbaApiService';
import { mapApiSeasonStatsToSeasonStatsData } from '../utils/dataMappers';

interface PlayerSeasonsResult {
  player1Seasons: SeasonStatsData[];
  player2Seasons: SeasonStatsData[];
  isLoading: boolean;
  error: Error | null;
}

export function usePlayerSeasons(
  player1: Player | null,
  player2: Player | null
): PlayerSeasonsResult {
  const player1Query = useQuery({
    queryKey: ['playerSeasons', player1?.id],
    queryFn: async () => {
      if (!player1) return [];
      const seasons = await getPlayerSeasonStats(player1.id);
      return seasons.map(mapApiSeasonStatsToSeasonStatsData);
    },
    enabled: !!player1,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  const player2Query = useQuery({
    queryKey: ['playerSeasons', player2?.id],
    queryFn: async () => {
      if (!player2) return [];
      const seasons = await getPlayerSeasonStats(player2.id);
      return seasons.map(mapApiSeasonStatsToSeasonStatsData);
    },
    enabled: !!player2,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  return {
    player1Seasons: player1Query.data || [],
    player2Seasons: player2Query.data || [],
    isLoading: player1Query.isLoading || player2Query.isLoading,
    error: player1Query.error || player2Query.error,
  };
} 