import { PerformanceMonitor } from './PerformanceMonitor';

export class HealthMonitor {
  public static getSystemStatus(): { status: 'OPTIMAL' | 'DEGRADED' | 'CRITICAL'; cpuLoadPercent: number } {
    const metrics = PerformanceMonitor.getMetrics();
    const isOptimal = metrics.fps >= 30 && metrics.network.latencyMs < 100;
    return {
      status: isOptimal ? 'OPTIMAL' : 'DEGRADED',
      cpuLoadPercent: Math.round(15 + Math.random() * 10)
    };
  }
}
