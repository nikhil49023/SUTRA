import { DroneRegistry } from '../core/DroneRegistry';

export class SwarmHealthMonitor {
  public static checkMeshHealth(): { healthPercent: number; healthyCount: number } {
    const nodes = DroneRegistry.getNodes();
    const healthy = nodes.filter((n) => n.batteryPercent >= 20 && n.signalQualityPercent >= 50);
    const healthPct = Math.round((healthy.length / (nodes.length || 1)) * 100);
    return {
      healthPercent: healthPct,
      healthyCount: healthy.length
    };
  }
}
