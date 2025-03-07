import axios from 'axios';

export interface Notification {
  id: string;
  userId: string;
  type: 'news' | 'game' | 'player' | 'achievement';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: any;
}

const API_BASE_URL = import.meta.env.VITE_API_PROXY;

export const getNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/user/${userId}/notifications`);
    return response.data;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

export const markNotificationAsRead = async (userId: string, notificationId: string) => {
  try {
    await axios.patch(`${API_BASE_URL}/user/${userId}/notifications/${notificationId}`, {
      read: true
    });
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}; 