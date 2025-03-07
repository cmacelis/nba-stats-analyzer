import { useEffect } from 'react';
import { cacheService } from '../services/cacheService';

export const useCache = (cleanupInterval = 60000) => {
  useEffect(() => {
    const interval = setInterval(() => {
      cacheService.clearExpired();
    }, cleanupInterval);

    return () => clearInterval(interval);
  }, [cleanupInterval]);
}; 