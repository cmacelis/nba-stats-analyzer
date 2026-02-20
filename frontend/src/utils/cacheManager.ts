import { QueryClient } from '@tanstack/react-query';
import { CompressionUtil } from './compression';

interface CacheConfig {
  maxAge: number;
  invalidateOnError: boolean;
  compressionThreshold?: number; // in bytes
  debug?: boolean;
}

class CacheManager {
  private queryClient: QueryClient;
  private config: CacheConfig;
  private readonly CACHE_KEY = 'nba_stats_cache';
  private readonly VERSION = '1.0.0';

  constructor(queryClient: QueryClient, config: CacheConfig) {
    this.queryClient = queryClient;
    this.config = {
      compressionThreshold: 1024, // 1KB
      debug: false,
      ...config
    };
  }

  private shouldCompress(data: string): boolean {
    return new Blob([data]).size > (this.config.compressionThreshold || 0);
  }

  private logDebug(...args: unknown[]) {
    if (this.config.debug) {
      console.debug('[CacheManager]', ...args);
    }
  }

  // Invalidate specific queries
  invalidateQueries(queryKey: readonly unknown[]) {
    this.queryClient.invalidateQueries({ queryKey });
  }

  // Invalidate all player-related queries
  async invalidatePlayerQueries() {
    await this.queryClient.invalidateQueries({ queryKey: ['playerSearch'] });
    await this.queryClient.invalidateQueries({ queryKey: ['player'] });
  }

  // Remove old cached data
  clearStaleData() {
    const now = Date.now();
    const queries = this.queryClient.getQueryCache().getAll();
    queries.forEach((query) => {
      const data = query.state.data;
      const updatedAt = query.state.dataUpdatedAt;
      
      if (data && updatedAt && (now - updatedAt > this.config.maxAge)) {
        this.queryClient.removeQueries({ queryKey: query.queryKey });
      }
    });
  }

  async persistCache() {
    try {
      const cache = this.queryClient.getQueryCache().getAll();
      const persistedData = cache.map(query => ({
        queryKey: query.queryKey,
        data: query.state.data,
        dataUpdatedAt: query.state.dataUpdatedAt,
        version: this.VERSION
      }));

      const jsonString = JSON.stringify(persistedData);
      let storageData: string;

      if (this.shouldCompress(jsonString)) {
        storageData = CompressionUtil.compress(persistedData);
        this.logDebug(
          `Cache compressed with ratio: ${CompressionUtil.getCompressionRatio(jsonString, storageData)}%`
        );
      } else {
        storageData = jsonString;
      }

      localStorage.setItem(this.CACHE_KEY, storageData);
      this.logDebug('Cache persisted successfully');
    } catch (error) {
      console.error('Failed to persist cache:', error);
    }
  }

  restoreCache() {
    try {
      const storedData = localStorage.getItem(this.CACHE_KEY);
      if (!storedData) return;

      let cache: Array<{ queryKey: unknown[]; data: unknown; dataUpdatedAt: number; version: string }>;
      type CacheItems = typeof cache;
      try {
        // Try to parse as compressed data first
        cache = CompressionUtil.decompress(storedData) as CacheItems;
      } catch {
        // If decompression fails, try parsing as regular JSON
        cache = JSON.parse(storedData) as CacheItems;
      }

      cache.forEach(item => {
        if (item.version === this.VERSION) {
          this.queryClient.setQueryData(
            item.queryKey,
            item.data
          );
        }
      });

      this.logDebug('Cache restored successfully');
    } catch (error) {
      console.error('Failed to restore cache:', error);
    }
  }

  setQueryData(queryKey: readonly unknown[], data: unknown) {
    this.queryClient.setQueryData(queryKey, data);
  }
}

export const createCacheManager = (queryClient: QueryClient, config?: Partial<CacheConfig>) => {
  return new CacheManager(queryClient, {
    maxAge: 1000 * 60 * 60, // 1 hour
    invalidateOnError: true,
    ...config
  });
}; 