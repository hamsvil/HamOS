import { ResourceMetrics } from '../../types/supreme';

/**
 * PILAR 9: RESOURCE-SENTINEL (The Physics Governor)
 * Manejemen sumber daya sistem untuk mencegah OOM dan kegagalan build.
 */
export class ResourceSentinel {
  private static instance: ResourceSentinel;
  private metrics: ResourceMetrics = {
    heapUsed: 0,
    heapTotal: 0,
    usagePercentage: 0,
    cpuLoad: 0,
    throttleActive: false,
  };

  private constructor() {
    this.startMonitoring();
  }

  public static getInstance(): ResourceSentinel {
    if (!ResourceSentinel.instance) {
      ResourceSentinel.instance = new ResourceSentinel();
    }
    return ResourceSentinel.instance;
  }

  private startMonitoring() {
    setInterval(() => {
      this.updateMetrics();
      this.checkThresholds();
    }, 2000);
  }

  private updateMetrics() {
    // Attempting to read from Node.js process if polyfilled, else use performance.memory
    try {
      const processObj = typeof process !== 'undefined' ? process : null;
      const windowObj = typeof window !== 'undefined' ? (window as any) : null;

      const mem = windowObj?.performance?.memory;
      if (mem) {
        this.metrics.heapUsed = mem.usedJSHeapSize;
        this.metrics.heapTotal = mem.jsHeapLimit;
        this.metrics.usagePercentage = (mem.usedJSHeapSize / mem.jsHeapLimit) * 100;
      } else if (processObj && processObj.memoryUsage) {
        const memUsage = processObj.memoryUsage();
        this.metrics.heapUsed = memUsage.heapUsed;
        this.metrics.heapTotal = memUsage.heapTotal;
        this.metrics.usagePercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      } else {
        // Fallback for non-chrome or polyfilled environment
        this.metrics.heapUsed = Math.random() * 500 * 1024 * 1024; // Simulated
        this.metrics.heapTotal = 2 * 1024 * 1024 * 1024;
        this.metrics.usagePercentage = (this.metrics.heapUsed / this.metrics.heapTotal) * 100;
      }
      
      // Simulated CPU Load
      this.metrics.cpuLoad = Math.random() * 30 + (this.metrics.throttleActive ? 5 : 20);
    } catch (e) {
      console.warn("[Resource-Sentinel] Monitoring inhibited:", e);
    }
  }

  private checkThresholds() {
    const CRITICAL_THRESHOLD = 85;
    if (this.metrics.usagePercentage > CRITICAL_THRESHOLD && !this.metrics.throttleActive) {
      this.activateThrottle();
    } else if (this.metrics.usagePercentage < 70 && this.metrics.throttleActive) {
      this.deactivateThrottle();
    }
  }

  private activateThrottle() {
    console.log("[RESOURCE-SENTINEL] CRITICAL MEMORY DETECTED. Activating AST Paging & Transformation Throttling.");
    this.metrics.throttleActive = true;
    // Notify SwarmTelepathy or event bus if available
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('supreme-throttle', { detail: { active: true } }));
    }
  }

  private deactivateThrottle() {
    console.log("[RESOURCE-SENTINEL] Memory stabilized. Resuming full speed.");
    this.metrics.throttleActive = false;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('supreme-throttle', { detail: { active: false } }));
    }
  }

  public getMetrics(): ResourceMetrics {
    return { ...this.metrics };
  }
}
