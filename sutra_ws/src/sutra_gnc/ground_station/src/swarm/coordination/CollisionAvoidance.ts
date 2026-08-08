import type { CollisionRisk } from '../types';
import { DroneRegistry } from '../core/DroneRegistry';

export class CollisionAvoidanceEngine {
  private static minSeparationMeters: number = 15;

  /**
   * Evaluate pairwise distance between all active swarm nodes to predict collision risks.
   */
  public static auditProximity(): CollisionRisk[] {
    const nodes = DroneRegistry.getNodes();
    const risks: CollisionRisk[] = [];

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i];
        const n2 = nodes[j];

        const dLatM = (n1.lat - n2.lat) * 111320;
        const dLngM = (n1.lng - n2.lng) * (111320 * Math.cos((n1.lat * Math.PI) / 180));
        const dAltM = n1.altitudeAGLM - n2.altitudeAGLM;

        const distanceM = Math.sqrt(dLatM * dLatM + dLngM * dLngM + dAltM * dAltM);

        if (distanceM < this.minSeparationMeters) {
          risks.push({
            id: `risk-${n1.droneId}-${n2.droneId}`,
            drone1Id: n1.droneId,
            drone2Id: n2.droneId,
            distanceMeters: Math.round(distanceM * 10) / 10,
            timeToImpactSec: Math.round((distanceM / 10) * 10) / 10,
            severity: distanceM < 8 ? 'CRITICAL' : 'WARNING',
            suggestedAction: `Ascend ${n1.callsign} by +10m and descend ${n2.callsign} by -10m for vertical deconfliction.`
          });
        }
      }
    }

    return risks;
  }
}
