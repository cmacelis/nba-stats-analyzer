interface CacheItem<T> {
  data: T;
  timestamp: number;
}

export class Cache {
  private storage = new Map<string, CacheItem<any>>();
  private readonly ttl: number;

  constructor(ttlMinutes: number = 5) {
    this.ttl = ttlMinutes * 60 * 1000;
  }

  set<T>(key: string, data: T): void {
    this.storage.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  get<T>(key: string): T | null {
    const item = this.storage.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      this.storage.delete(key);
      return null;
    }

    return item.data as T;
  }

  clear(): void {
    this.storage.clear();
  }
} 