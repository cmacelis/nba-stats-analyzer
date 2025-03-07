import axios from 'axios';

export interface ComparisonHistory {
  id: string;
  date: string;
  player1: {
    id: string;
    name: string;
    stats: any;
  };
  player2: {
    id: string;
    name: string;
    stats: any;
  };
  notes?: string;
}

export interface UserPreferences {
  favoriteTeams: string[];
  notifications: {
    email: {
      news: boolean;
      gameAlerts: boolean;
      playerUpdates: boolean;
      achievements: boolean;
    };
    push: {
      news: boolean;
      gameAlerts: boolean;
      playerUpdates: boolean;
      achievements: boolean;
    };
  };
  theme: 'light' | 'dark';
  emailFrequency: 'instant' | 'daily' | 'weekly';
}

const API_BASE_URL = import.meta.env.VITE_API_PROXY;

export const getUserHistory = async (userId: string): Promise<ComparisonHistory[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/user/${userId}/history`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user history:', error);
    return [];
  }
};

export const saveComparison = async (userId: string, comparison: Omit<ComparisonHistory, 'id' | 'date'>) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/user/${userId}/history`, comparison);
    return response.data;
  } catch (error) {
    console.error('Error saving comparison:', error);
    throw error;
  }
};

export const getUserPreferences = async (userId: string): Promise<UserPreferences> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/user/${userId}/preferences`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return {
      favoriteTeams: [],
      notifications: {
        email: {
          news: true,
          gameAlerts: true,
          playerUpdates: true,
          achievements: true
        },
        push: {
          news: true,
          gameAlerts: true,
          playerUpdates: true,
          achievements: true
        }
      },
      theme: 'light',
      emailFrequency: 'instant'
    };
  }
};

export const updateUserPreferences = async (userId: string, preferences: Partial<UserPreferences>) => {
  try {
    const response = await axios.patch(`${API_BASE_URL}/user/${userId}/preferences`, preferences);
    return response.data;
  } catch (error) {
    console.error('Error updating user preferences:', error);
    throw error;
  }
};

export const deleteHistoryItem = async (userId: string, historyId: string) => {
  try {
    await axios.delete(`${API_BASE_URL}/user/${userId}/history/${historyId}`);
    return true;
  } catch (error) {
    console.error('Error deleting history item:', error);
    return false;
  }
}; 