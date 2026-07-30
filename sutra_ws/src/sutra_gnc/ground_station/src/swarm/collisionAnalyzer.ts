import type { SwarmDroneMember, CollisionWarning } from './types';
import { GISService } from '../services/gisService';

export class CollisionAnalyzer {
  /**
   * Checks inter-drone distances across all swarm members and computes collision risks
   */
  static checkCollisionRisks(
    members: SwarmDroneMember[],
    safetyThresholdM: number = 15.0
  ): CollisionWarning[] {
    const warnings: CollisionWarning[] = [];

    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const d1 = members[i];
        const d2 = members[j];

        const horizontalDistM = GISService.calculateRouteDistance([
          [d1.position.lat, d1.position.lng],
          [d2.position.lat, d2.position.lng]
        ]) * 1000;

        const altDiffM = Math.abs(d1.position.alt - d2.position.alt);
        const totalDistanceM = +Math.sqrt(horizontalDistM * horizontalDistM + altDiffM * altDiffM).toFixed(1);

        if (totalDistanceM < safetyThresholdM) {
          warnings.push({
            id: `WARN-COL-${d1.sysId}-${d2.sysId}`,
            drone1SysId: d1.sysId,
            drone2SysId: d2.sysId,
            separationDistanceM: totalDistanceM,
            timeToCollisionSec: +(totalDistanceM / 5.0).toFixed(1),
            severity: totalDistanceM < 8.0 ? 'CRITICAL' : 'WARNING'
          });
        }
      }
    }

    return warnings;
  }
}
