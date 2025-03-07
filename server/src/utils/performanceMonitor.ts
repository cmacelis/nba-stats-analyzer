interface RequestMetrics {
  path: string;
  duration: number;
  timestamp: number;
  status: number;
  cached: boolean;
}

class PerformanceMonitor {
  private metrics: RequestMetrics[] = [];
  private readonly maxMetrics = 1000;

  logRequest(metrics: RequestMetrics): void {
    this.metrics.push(metrics);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log slow requests
    if (metrics.duration > 5000) {
      console.warn(`Slow request detected: ${metrics.path} (${metrics.duration}ms)`);
    }
  }

  getAverageResponseTime(path?: string): number {
    const relevantMetrics = path
      ? this.metrics.filter(m => m.path === path)
      : this.metrics;

    if (relevantMetrics.length === 0) return 0;

    const total = relevantMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / relevantMetrics.length;
  }

  getCacheHitRate(): number {
    if (this.metrics.length === 0) return 0;
    const cacheHits = this.metrics.filter(m => m.cached).length;
    return (cacheHits / this.metrics.length) * 100;
  }
}

export const performanceMonitor = new PerformanceMonitor(); 