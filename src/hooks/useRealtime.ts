import { useEffect, useCallback } from 'react';
import { realtimeService } from '../services/realtimeService';
import { useToast } from '../contexts/ToastContext';

interface UseRealtimeOptions {
  onGameUpdate?: (data: any) => void;
  onStatUpdate?: (data: any) => void;
  onNotification?: (data: any) => void;
  showToasts?: boolean;
}

export const useRealtime = (options: UseRealtimeOptions = {}) => {
  const { showToast } = useToast();

  const handleGameUpdate = useCallback((data: any) => {
    if (options.showToasts) {
      showToast(`Game Update: ${data.message}`, 'info');
    }
    options.onGameUpdate?.(data);
  }, [options, showToast]);

  const handleStatUpdate = useCallback((data: any) => {
    if (options.showToasts) {
      showToast(`Stat Update: ${data.message}`, 'info');
    }
    options.onStatUpdate?.(data);
  }, [options, showToast]);

  const handleNotification = useCallback((data: any) => {
    if (options.showToasts) {
      showToast(data.message, data.type || 'info');
    }
    options.onNotification?.(data);
  }, [options, showToast]);

  useEffect(() => {
    const unsubscribeGame = realtimeService.subscribe('gameUpdate', handleGameUpdate);
    const unsubscribeStat = realtimeService.subscribe('statUpdate', handleStatUpdate);
    const unsubscribeNotification = realtimeService.subscribe('notification', handleNotification);

    realtimeService.connect();

    return () => {
      unsubscribeGame();
      unsubscribeStat();
      unsubscribeNotification();
      realtimeService.disconnect();
    };
  }, [handleGameUpdate, handleStatUpdate, handleNotification]);

  return {
    sendMessage: realtimeService.send.bind(realtimeService)
  };
}; 