import { api } from './api';

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  source: string;
  publishedAt: string;
  url: string;
  imageUrl?: string;
}

export const fetchNBANews = async (filters?: any): Promise<NewsItem[]> => {
  try {
    const response = await api.get('/news', { params: filters });
    return response.data;
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
};

export const getTrendingNews = async (): Promise<NewsItem[]> => {
  try {
    const response = await api.get('/news/trending');
    return response.data;
  } catch (error) {
    console.error('Error fetching trending news:', error);
    return [];
  }
};

export const bookmarkNews = async (userId: string, newsId: string): Promise<boolean> => {
  try {
    await api.post(`/user/${userId}/bookmarks`, { newsId });
    return true;
  } catch (error) {
    console.error('Error bookmarking news:', error);
    return false;
  }
};

export const getBookmarkedNews = async (userId: string): Promise<NewsItem[]> => {
  try {
    const response = await api.get(`/user/${userId}/bookmarks`);
    return response.data;
  } catch (error) {
    console.error('Error fetching bookmarked news:', error);
    return [];
  }
};

export const removeBookmark = async (userId: string, newsId: string): Promise<boolean> => {
  try {
    await api.delete(`/user/${userId}/bookmarks/${newsId}`);
    return true;
  } catch (error) {
    console.error('Error removing bookmark:', error);
    return false;
  }
}; 