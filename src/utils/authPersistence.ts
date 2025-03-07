import { auth } from '../config/firebase';
import { ErrorLogger } from './errorLogger';

const TOKEN_REFRESH_INTERVAL = 50 * 60 * 1000; // 50 minutes
let lastTokenRefresh = 0;

export const checkAuthPersistence = async (): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return false;

    const now = Date.now();
    // Only refresh token if enough time has passed
    if (now - lastTokenRefresh > TOKEN_REFRESH_INTERVAL) {
      const token = await currentUser.getIdToken(false); // Don't force refresh
      lastTokenRefresh = now;
      return !!token;
    }
    
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('auth/quota-exceeded')) {
      console.warn('Token refresh quota exceeded, using cached auth state');
      return !!auth.currentUser;
    }
    
    ErrorLogger.log(error as Error, 'high', { 
      type: 'auth', 
      context: 'persistence-check'
    });
    return false;
  }
}; 