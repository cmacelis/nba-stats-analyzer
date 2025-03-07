import { useState, useCallback } from 'react';
import { Player, PlayerStats } from '../types/nba';
import { nbaApi } from '../services/nbaApi';
import { ErrorLogger } from '../utils/errorLogger';

interface ComparisonData {
  player1: Player | null;
  player2: Player | null;
  seasonStats1: PlayerStats[];
  seasonStats2: PlayerStats[];
}

export function useComparisonData(season: string) {
  const [data, setData] = useState<ComparisonData>({
    player1: null,
    player2: null,
    seasonStats1: [],
    seasonStats2: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPlayerData = useCallback(async (playerId: string, slot: 'player1' | 'player2') => {
    try {
      setLoading(true);
      setError(null);

      const [player, stats] = await Promise.all([
        nbaApi.getPlayer(playerId),
        nbaApi.getPlayerStats(playerId, season)
      ]);

      setData(prev => ({
        ...prev,
        [slot]: player,
        [`seasonStats${slot.slice(-1)}`]: stats
      }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch player data');
      ErrorLogger.log(error, 'high', { playerId, season });
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [season]);

  return { data, loading, error, fetchPlayerData };
} 