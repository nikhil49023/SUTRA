import type { FormationOffset, FormationPattern } from '../types';
import { FormationGenerator } from './FormationGenerator';
import { DroneRegistry } from '../core/DroneRegistry';

export class FormationController {
  private static currentPattern: FormationPattern = 'V_FORMATION';
  private static spacingMeters: number = 25;

  public static setFormation(pattern: FormationPattern, spacing: number = 25): void {
    this.currentPattern = pattern;
    this.spacingMeters = spacing;
  }

  public static getTargetPositions(): { droneId: string; targetLat: number; targetLng: number; isLeader: boolean }[] {
    const nodes = DroneRegistry.getNodes();
    const ids = nodes.map((n) => n.droneId);
    const offsets = FormationGenerator.generateOffsets(ids, this.currentPattern, this.spacingMeters);

    const leaderNode = nodes.find((n) => n.isLeader) || nodes[0];
    if (!leaderNode) return [];

    return offsets.map((off) => {
      const deltaLat = off.dyMeters / 111320;
      const deltaLng = off.dxMeters / (111320 * Math.cos((leaderNode.lat * Math.PI) / 180));

      return {
        droneId: off.droneId,
        targetLat: leaderNode.lat + deltaLat,
        targetLng: leaderNode.lng + deltaLng,
        isLeader: off.isLeader
      };
    });
  }

  public static getCurrentPattern(): FormationPattern {
    return this.currentPattern;
  }
}
