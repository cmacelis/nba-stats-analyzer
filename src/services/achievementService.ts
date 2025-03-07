import axios from 'axios';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  progress?: {
    current: number;
    total: number;
  };
}

const API_BASE_URL = import.meta.env.VITE_API_PROXY;

export const getAchievements = async (userId: string): Promise<Achievement[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/user/${userId}/achievements`);
    return response.data;
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return [];
  }
}; 