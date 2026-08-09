import { TelemetryThrottler } from './telemetryThrottler';
import { DetectionOptimizer } from './detectionOptimizer';

export class PerformanceManager {
  private static instance: PerformanceManager;
  private throttler: TelemetryThrottler = new TelemetryThrottler();

  private constructor() {}

  public static getInstance(): PerformanceManager {
    if (!PerformanceManager.instance) {
      PerformanceManager.instance = new PerformanceManager();
    }
    return PerformanceManager.instance;
  }

  public getThrottler(): TelemetryThrottler {
    return this.throttler;
  }

  public getDetectionOptimizer() {
    return DetectionOptimizer;
  }
}

export const performanceManager = PerformanceManager.getInstance();
