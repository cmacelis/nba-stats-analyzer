import { useQuery } from '@tanstack/react-query';
import { Player, Matchup } from '../types/player';
import { getHeadToHeadMatchups } from '../services/nbaApiService';
import { mapApiMatchupToMatchup } from '../utils/dataMappers';

interface HeadToHeadResult {
  matchups: Matchup[];
  isLoading: boolean;
  error: Error | null;
}

export function useHeadToHead(
  player1: Player | null,
  player2: Player | null
): HeadToHeadResult {
  const query = useQuery({
    queryKey: ['headToHead', player1?.id, player2?.id],
    queryFn: async () => {
      if (!player1 || !player2) return [];
      const matchups = await getHeadToHeadMatchups(player1.id, player2.id);
      return matchups.map(m => mapApiMatchupToMatchup(m, player1.id, player2.id));
    },
    enabled: !!player1 && !!player2,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  return {
    matchups: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
  };
} 