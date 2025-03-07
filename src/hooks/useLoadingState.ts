import { useState, useCallback } from 'react';

interface LoadingState {
  loading: boolean;
  error: string | null;
}

export const useLoadingState = (initialLoading = false) => {
  const [state, setState] = useState<LoadingState>({
    loading: initialLoading,
    error: null
  });

  const startLoading = useCallback(() => {
    setState(prev => ({ ...prev, loading: true, error: null }));
  }, []);

  const stopLoading = useCallback((error?: string) => {
    setState(prev => ({ ...prev, loading: false, error: error || null }));
  }, []);

  return {
    ...state,
    startLoading,
    stopLoading
  };
}; 