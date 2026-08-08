import { FPSMonitor } from './FPSMonitor';
import { MemoryMonitor } from './MemoryMonitor';
import { NetworkMonitor } from './NetworkMonitor';

export class PerformanceMonitor {
  public static getMetrics() {
    return {
      fps: FPSMonitor.getFPS(),
      memory: MemoryMonitor.getMemoryUsage(),
      network: NetworkMonitor.getNetworkStats()
    };
  }
}
