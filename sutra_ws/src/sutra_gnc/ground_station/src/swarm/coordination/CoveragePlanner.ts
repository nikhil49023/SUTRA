import { DroneRegistry } from '../core/DroneRegistry';

export class CoveragePlanner {
  public static partitionArea(centerLat: number, centerLng: number, radiusM: number = 600) {
    const nodes = DroneRegistry.getNodes();
    return nodes.map((n, idx) => ({
      droneId: n.droneId,
      subAreaId: `sector-${idx + 1}`,
      coverageKm2: Math.round((0.1 + idx * 0.05) * 100) / 100
    }));
  }
}
