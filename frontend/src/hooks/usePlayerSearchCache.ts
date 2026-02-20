import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Player } from '../types/player';
import { searchPlayers } from '../services/playerService';
import { createCacheManager } from '../utils/cacheManager';
import { useOfflineDetection } from './useOfflineDetection';
import { useEffect } from 'react';

interface UsePlayerSearchCache {
  searchQuery: string;
  options?: {
    enabled?: boolean;
    staleTime?: number;
    cacheTime?: number;
    persistCache?: boolean;
    invalidateOnError?: boolean;
  };
}

export function usePlayerSearchCache({ 
  searchQuery, 
  options = {} 
}: UsePlayerSearchCache) {
  const { 
    enabled = true,
    staleTime = 1000 * 60 * 5, // 5 minutes
    cacheTime = 1000 * 60 * 30, // 30 minutes
    persistCache = true,
    invalidateOnError = true
  } = options;

  const queryClient = useQueryClient();
  const cacheManager = createCacheManager(queryClient, {
    maxAge: cacheTime,
    invalidateOnError
  });
  const isOffline = useOfflineDetection({
    onOffline: () => {
      // When going offline, extend cache time to prevent data loss
      queryClient.setDefaultOptions({
        queries: {
          gcTime: Infinity,
          staleTime: Infinity,
        },
      });
    },
    onOnline: () => {
      // When back online, restore default cache settings
      queryClient.setDefaultOptions({
        queries: {
          gcTime: cacheTime,
          staleTime,
        },
      });
      // Invalidate potentially stale data
      cacheManager.invalidatePlayerQueries();
    },
  });

  // Restore cache on mount
  useEffect(() => {
    if (persistCache) {
      cacheManager.restoreCache();
    }
    // cacheManager is recreated each render; intentionally run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist cache on unmount
  useEffect(() => {
    if (persistCache) {
      return () => {
        cacheManager.persistCache();
      };
    }
    // cacheManager is recreated each render; intentionally run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear stale data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      cacheManager.clearStaleData();
    }, 1000 * 60 * 15); // Every 15 minutes

    return () => clearInterval(interval);
    // cacheManager is recreated each render; intentionally run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useQuery({
    queryKey: ['playerSearch', searchQuery],
    queryFn: () => searchPlayers(searchQuery),
    enabled: enabled && searchQuery.length >= 2,
    staleTime,
    gcTime: cacheTime,
    select: (data: Player[]) => {
      return data.sort((a, b) => {
        const aStartsWithQuery = a.name.toLowerCase().startsWith(searchQuery.toLowerCase());
        const bStartsWithQuery = b.name.toLowerCase().startsWith(searchQuery.toLowerCase());
        return bStartsWithQuery ? 1 : aStartsWithQuery ? -1 : 0;
      });
    },
    meta: {
      onSuccess: (data: Player[]) => {
        if (!isOffline) {
          data.forEach((player: Player) => {
            queryClient.setQueryData(
              ['player', player.id],
              player
            );
          });
        }
      },
      onError: (_error: Error) => {
        if (!isOffline && invalidateOnError) {
          cacheManager.invalidateQueries(['playerSearch', searchQuery]);
        }
      }
    }
  });
} 