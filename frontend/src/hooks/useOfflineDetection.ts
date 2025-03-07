import { useState, useEffect } from 'react';

interface OfflineDetectionOptions {
  onOffline?: () => void;
  onOnline?: () => void;
}

export function useOfflineDetection(options: OfflineDetectionOptions = {}) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { onOffline, onOnline } = options;

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      onOffline?.();
    };

    const handleOnline = () => {
      setIsOffline(false);
      onOnline?.();
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [onOffline, onOnline]);

  return isOffline;
} 