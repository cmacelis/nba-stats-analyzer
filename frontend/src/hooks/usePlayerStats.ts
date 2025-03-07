import { useQuery } from '@tanstack/react-query';
import { Player, PlayerStats } from '../types/player';
import { mockPlayerStats } from '../services/mockData';

export function usePlayerStats(player1: Player | null, player2: Player | null) {
  const { data: stats1, isLoading: loading1 } = useQuery({
    queryKey: ['playerStats', player1?.id],
    queryFn: async (): Promise<PlayerStats> => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!player1?.id || !mockPlayerStats[player1.id]) {
        throw new Error('Stats not found');
      }
      return mockPlayerStats[player1.id];
    },
    enabled: !!player1,
  });

  const { data: stats2, isLoading: loading2 } = useQuery({
    queryKey: ['playerStats', player2?.id],
    queryFn: async (): Promise<PlayerStats> => {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!player2?.id || !mockPlayerStats[player2.id]) {
        throw new Error('Stats not found');
      }
      return mockPlayerStats[player2.id];
    },
    enabled: !!player2,
  });

  return {
    stats1,
    stats2,
    isLoading: loading1 || loading2,
    error: null,
  };
} 