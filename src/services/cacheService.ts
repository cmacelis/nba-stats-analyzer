export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  clear(): Promise<void>;
}

class LocalStorageCacheService implements CacheService {
  async get<T>(key: string): Promise<T | null> {
    const item = localStorage.getItem(key);
    if (!item) return null;

    const { value, expiry } = JSON.parse(item);
    if (expiry && Date.now() > expiry) {
      localStorage.removeItem(key);
      return null;
    }

    return value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const item = {
      value,
      expiry: Date.now() + (ttlSeconds * 1000)
    };
    localStorage.setItem(key, JSON.stringify(item));
  }

  async clear(): Promise<void> {
    localStorage.clear();
  }
}

export const cacheService = new LocalStorageCacheService(); 