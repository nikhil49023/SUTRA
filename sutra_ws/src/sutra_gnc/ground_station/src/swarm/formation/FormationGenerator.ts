import type { FormationOffset, FormationPattern } from '../types';

export class FormationGenerator {
  /**
   * Generate 3D spatial offsets relative to Leader (at 0,0,0).
   */
  public static generateOffsets(
    droneIds: string[],
    pattern: FormationPattern,
    spacingMeters: number = 25
  ): FormationOffset[] {
    const offsets: FormationOffset[] = [];

    droneIds.forEach((id, idx) => {
      if (idx === 0) {
        // Leader
        offsets.push({ droneId: id, dxMeters: 0, dyMeters: 0, dzMeters: 0, isLeader: true });
        return;
      }

      const followerIdx = idx;
      let dx = 0;
      let dy = 0;
      let dz = 0;

      switch (pattern) {
        case 'LINE':
          dx = (followerIdx % 2 === 1 ? 1 : -1) * Math.ceil(followerIdx / 2) * spacingMeters;
          dy = 0;
          break;
        case 'COLUMN':
          dx = 0;
          dy = -followerIdx * spacingMeters;
          break;
        case 'V_FORMATION':
          dx = (followerIdx % 2 === 1 ? 1 : -1) * Math.ceil(followerIdx / 2) * spacingMeters;
          dy = -Math.ceil(followerIdx / 2) * spacingMeters;
          break;
        case 'DIAMOND':
          if (followerIdx === 1) { dx = -spacingMeters; dy = -spacingMeters; }
          else if (followerIdx === 2) { dx = spacingMeters; dy = -spacingMeters; }
          else if (followerIdx === 3) { dx = 0; dy = -spacingMeters * 2; }
          else { dx = (followerIdx % 2 === 1 ? 1 : -1) * spacingMeters * 2; dy = -spacingMeters * 2; }
          break;
        case 'CIRCLE': {
          const angle = (followerIdx / Math.max(1, droneIds.length - 1)) * 2 * Math.PI;
          dx = Math.cos(angle) * spacingMeters;
          dy = Math.sin(angle) * spacingMeters;
          break;
        }
        case 'GRID': {
          const col = (followerIdx - 1) % 3;
          const row = Math.floor((followerIdx - 1) / 3);
          dx = (col - 1) * spacingMeters;
          dy = -(row + 1) * spacingMeters;
          break;
        }
        default:
          dx = followerIdx * spacingMeters;
          dy = 0;
      }

      offsets.push({
        droneId: id,
        dxMeters: dx,
        dyMeters: dy,
        dzMeters: dz,
        isLeader: false
      });
    });

    return offsets;
  }
}
