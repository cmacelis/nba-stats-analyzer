import { Player, PlayerStats, ComparisonData } from '../types/player';
import { mockPlayers, mockPlayerStats, mockHeadToHead } from './mockData';
import { validatePlayerStats } from '../utils/statsValidator';

export const searchPlayers = async (query: string): Promise<Player[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));

  const normalizedQuery = query.toLowerCase();
  return mockPlayers.filter(
    player => 
      player.name.toLowerCase().includes(normalizedQuery) ||
      player.team.toLowerCase().includes(normalizedQuery)
  );
};

export const getPlayerById = async (id: number): Promise<Player> => {
  try {
    // TODO: Replace with actual API endpoint
    // const response = await apiClient.get(`/api/players/${id}`);
    // return response.data;

    const mockPlayers = await searchPlayers('');
    const player = mockPlayers.find(p => p.id === id);
    if (!player) {
      throw new Error('Player not found');
    }
    return player;
  } catch (error) {
    console.error('Error fetching player:', error);
    throw error;
  }
};

export async function getPlayerStats(playerId: number): Promise<PlayerStats> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const stats = mockPlayerStats[playerId];
  if (!stats) {
    throw new Error(`Stats not found for player ${playerId}`);
  }

  // Validate and ensure all properties exist
  return validatePlayerStats(stats);
}

export async function getPlayerComparison(player1Id: number, player2Id: number): Promise<ComparisonData> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 700));
  
  const key = `${player1Id}-${player2Id}`;
  const reverseKey = `${player2Id}-${player1Id}`;
  
  const comparison = mockHeadToHead[key] || mockHeadToHead[reverseKey];
  if (!comparison) {
    throw new Error('Comparison data not found');
  }
  
  return comparison;
} 