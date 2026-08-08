import type { SwarmAnalyticsSummary } from '../types';
import { DroneRegistry } from '../core/DroneRegistry';
import { CollisionAvoidanceEngine } from '../coordination/CollisionAvoidance';
import { SwarmHealthMonitor } from '../communication/HealthMonitor';

export class SwarmAnalyticsEngine {
  public static computeSummary(): SwarmAnalyticsSummary {
    const nodes = DroneRegistry.getNodes();
    const activeCount = nodes.filter((n) => n.status !== 'FAULT' && n.status !== 'RTL').length;
    const utilizationPct = Math.round((activeCount / (nodes.length || 1)) * 100);

    const totalBat = nodes.reduce((sum, n) => sum + n.batteryPercent, 0);
    const avgBat = Math.round(totalBat / (nodes.length || 1));

    const conflicts = CollisionAvoidanceEngine.auditProximity();
    const meshHealth = SwarmHealthMonitor.checkMeshHealth();

    return {
      activeDroneCount: nodes.length,
      fleetUtilizationPercent: utilizationPct,
      areaCoverageKm2: Math.round((nodes.length * 0.45) * 100) / 100,
      avgBatteryPercent: avgBat,
      formationIntegrityPercent: 96,
      meshHealthPercent: meshHealth.healthPercent,
      activeConflictsCount: conflicts.length
    };
  }
}
