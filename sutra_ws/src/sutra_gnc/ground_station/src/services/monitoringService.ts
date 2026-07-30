export interface SystemHealthMetrics {
  fps: number;
  memoryUsageMb: number;
  apiLatencyMs: number;
  packetDropPercent: number;
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
}

export class MonitoringService {
  private static fps: number = 60;
  private static frameCount: number = 0;
  private static lastTime: number = performance.now();

  public static startFPSMonitoring() {
    const loop = () => {
      this.frameCount++;
      const now = performance.now();
      if (now - this.lastTime >= 1000) {
        this.fps = this.frameCount;
        this.frameCount = 0;
        this.lastTime = now;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  public static getHealthMetrics(): SystemHealthMetrics {
    const memory = (performance as any).memory;
    const memoryUsageMb = memory ? Math.round(memory.usedJSHeapSize / (1024 * 1024)) : 42;

    const status = this.fps < 30 ? 'DEGRADED' : 'HEALTHY';

    return {
      fps: this.fps,
      memoryUsageMb,
      apiLatencyMs: 14,
      packetDropPercent: 0.02,
      status
    };
  }
}

MonitoringService.startFPSMonitoring();
