import axios from 'axios';
import { Player, PlayerStats } from '../types/nba';

const API_BASE_URL = import.meta.env.VITE_API_PROXY;

export const fetchPlayerStats = async (playerId: string, timeRange: string): Promise<PlayerStats[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/players/${playerId}/stats`, {
      params: { timeRange }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching player stats:', error);
    throw error;
  }
};

export const fetchPlayerComparison = async (
  player1Id: string,
  player2Id: string,
  stat: string,
  timeRange: string
) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/players/compare`, {
      params: {
        player1Id,
        player2Id,
        stat,
        timeRange
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching comparison data:', error);
    throw error;
  }
}; 