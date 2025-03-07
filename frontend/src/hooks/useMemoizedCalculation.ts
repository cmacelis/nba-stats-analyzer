import { useMemo, useRef, useCallback } from 'react';

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

export function useMemoizedCalculation<T>(
  calculation: () => T,
  dependencies: any[],
  options: {
    cacheTime?: number;
    onError?: (error: Error) => void;
  } = {}
) {
  const { cacheTime = 5000, onError } = options;
  const cacheRef = useRef<CacheEntry<T> | null>(null);

  const execute = useCallback(() => {
    const now = Date.now();
    
    // Return cached value if within cache time
    if (cacheRef.current && now - cacheRef.current.timestamp < cacheTime) {
      return cacheRef.current.value;
    }

    try {
      const result = calculation();
      cacheRef.current = {
        value: result,
        timestamp: now
      };
      return result;
    } catch (error) {
      onError?.(error as Error);
      throw error;
    }
  }, [calculation, cacheTime, onError]);

  return useMemo(() => execute(), dependencies);
} 