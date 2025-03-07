import { useState, useEffect, useCallback } from 'react';
import { offlineStorage } from '../services/offlineStorage';
import { useToast } from '../contexts/ToastContext';
import type { Player, PlayerStats } from '../types/nba';

export const useOfflineStorage = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { showToast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Back online - syncing data...', 'info');
      offlineStorage.processSyncQueue().catch(error => {
        console.error('Sync failed:', error);
        showToast('Sync failed', 'error');
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast('You are offline - data will be synced when connection is restored', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  const savePlayer = useCallback(async (player: Player) => {
    try {
      await offlineStorage.savePlayer(player);
      if (!isOnline) {
        showToast('Player saved offline', 'info');
      }
    } catch (error) {
      showToast('Failed to save player', 'error');
      throw error;
    }
  }, [isOnline, showToast]);

  const getPlayer = useCallback(async (id: string) => {
    try {
      return await offlineStorage.getPlayer(id);
    } catch (error) {
      showToast('Failed to get player', 'error');
      throw error;
    }
  }, [showToast]);

  return {
    isOnline,
    savePlayer,
    getPlayer
  };
}; 