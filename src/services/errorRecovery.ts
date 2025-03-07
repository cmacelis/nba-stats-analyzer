import { Cache } from './cache';

export class ErrorRecovery {
  private static readonly FALLBACK_CACHE = new Cache(60); // 1 hour TTL for fallback data
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

  static async withFallback<T>(
    operation: () => Promise<T>,
    fallbackKey: string,
    fallbackData: T
  ): Promise<T> {
    try {
      const result = await this.withRetry(operation);
      this.FALLBACK_CACHE.set(fallbackKey, result);
      return result;
    } catch (error) {
      console.error('Operation failed, using fallback data:', error);
      return this.FALLBACK_CACHE.get(fallbackKey) || fallbackData;
    }
  }

  static async withRetry<T>(
    operation: () => Promise<T>,
    retries: number = this.MAX_RETRIES
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0) {
        const delay = this.RETRY_DELAYS[this.MAX_RETRIES - retries];
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.withRetry(operation, retries - 1);
      }
      throw error;
    }
  }
} 