interface CacheItem {
  data: any;
  timestamp: number;
}

class Cache {
  private store: Map<string, CacheItem>;
  private ttl: number; // Time to live in milliseconds

  constructor(ttlMinutes: number = 5) {
    this.store = new Map();
    this.ttl = ttlMinutes * 60 * 1000;
  }

  set(key: string, data: any): void {
    this.store.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  get(key: string): any | null {
    const item = this.store.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      this.store.delete(key);
      return null;
    }

    return item.data;
  }

  clear(): void {
    this.store.clear();
  }
}

export const nbaStatsCache = new Cache(5); // 5 minutes cache 