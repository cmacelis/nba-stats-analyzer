import { apiClient } from '../utils/apiClient';
import { Player, PlayerStats, ComparisonData } from '../types/player';

interface StatsResponse {
  stats: PlayerStats;
  lastUpdated: string;
}

export async function getPlayerStats(playerId: number): Promise<PlayerStats> {
  const { data } = await apiClient.get(`/api/players/${playerId}/stats`);
  return data;
}

export async function getPlayerStatsComparison(
  player1Id: number,
  player2Id: number
): Promise<ComparisonData> {
  const { data } = await apiClient.get(`/api/players/compare/${player1Id}/${player2Id}`);
  return data;
}

export const getPlayerStatsComparisonOld = async (player1Id: number, player2Id: number) => {
  try {
    const [stats1, stats2] = await Promise.all([
      getPlayerStats(player1Id),
      getPlayerStats(player2Id)
    ]);

    return { stats1, stats2 };
  } catch (error) {
    console.error('Error fetching stats comparison:', error);
    throw error;
  }
};