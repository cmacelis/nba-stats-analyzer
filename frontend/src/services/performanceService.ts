interface LayoutShiftEntry extends PerformanceEntry {
  hadRecentInput: boolean;
  value: number;
}

type MetricName = 'FCP' | 'LCP' | 'CLS' | 'FID' | 'TTI' | 'Custom';

interface PerformanceMetric {
  name: MetricName;
  value: number;
  timestamp: number;
  context?: Record<string, unknown>;
}

class PerformanceService {
  private metrics: PerformanceMetric[] = [];
  private observers: Set<(metric: PerformanceMetric) => void> = new Set();

  constructor() {
    this.initializeObservers();
  }

  private initializeObservers() {
    // First Contentful Paint
    if ('PerformanceObserver' in window) {
      const fcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        if (entries.length > 0) {
          const fcp = entries[0];
          this.recordMetric('FCP', fcp.startTime);
        }
      });

      fcpObserver.observe({ entryTypes: ['paint'] });

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        if (entries.length > 0) {
          const lcp = entries[entries.length - 1];
          this.recordMetric('LCP', lcp.startTime);
        }
      });

      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        if (entries.length > 0) {
          const fid = entries[0];
          this.recordMetric('FID', fid.duration);
        }
      });

      fidObserver.observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift with proper typing
      const clsObserver = new PerformanceObserver((entryList) => {
        let clsValue = 0;
        for (const entry of entryList.getEntries()) {
          const layoutShift = entry as LayoutShiftEntry;
          if (!layoutShift.hadRecentInput) {
            clsValue += layoutShift.value;
          }
        }
        this.recordMetric('CLS', clsValue);
      });

      clsObserver.observe({ entryTypes: ['layout-shift'] });
    }
  }

  public recordMetric(name: MetricName, value: number, context?: Record<string, unknown>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      context
    };

    this.metrics.push(metric);
    this.notifyObservers(metric);

    // Send to analytics service
    this.sendToAnalytics(metric);
  }

  public subscribe(callback: (metric: PerformanceMetric) => void) {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  private notifyObservers(metric: PerformanceMetric) {
    this.observers.forEach(observer => observer(metric));
  }

  private sendToAnalytics(metric: PerformanceMetric) {
    // TODO: Implement analytics service integration
    console.log('Performance metric:', metric);
  }

  public getMetrics() {
    return [...this.metrics];
  }

  public clearMetrics() {
    this.metrics = [];
  }
}

export const performanceService = new PerformanceService(); 