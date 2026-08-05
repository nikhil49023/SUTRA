import type { FormationType, FormationOffset, FormationTarget } from './FormationTypes';

export class FormationCalculator {
  /**
   * Calculates local 3D offset vectors (dx, dy, dz) in meters relative to Leader (at 0,0,0).
   */
  public static calculateOffsets(
    droneIds: string[],
    formationType: FormationType,
    spacingMeters: number = 25,
    leaderId: string = droneIds[0]
  ): FormationOffset[] {
    const offsets: FormationOffset[] = [];
    const followerIds = droneIds.filter((id) => id !== leaderId);

    // Leader always at origin (0, 0, 0)
    offsets.push({
      droneId: leaderId,
      index: 0,
      dxMeters: 0,
      dyMeters: 0,
      dzMeters: 0,
      isLeader: true
    });

    followerIds.forEach((id, idx) => {
      const k = idx + 1; // Follower index starting from 1
      let dx = 0;
      let dy = 0;
      let dz = 0;

      switch (formationType) {
        case 'LINE': {
          // Spread transversely perpendicular to heading
          const side = k % 2 === 1 ? 1 : -1;
          const mag = Math.ceil(k / 2);
          dx = side * mag * spacingMeters;
          dy = 0;
          break;
        }

        case 'COLUMN': {
          // Trailing in a single line behind leader
          dx = 0;
          dy = -k * spacingMeters;
          break;
        }

        case 'V_FORMATION': {
          // Symmetric chevron V shape pointing forward
          const side = k % 2 === 1 ? 1 : -1;
          const mag = Math.ceil(k / 2);
          dx = side * mag * spacingMeters;
          dy = -mag * spacingMeters;
          break;
        }

        case 'DIAMOND': {
          // Diamond pattern around leader
          if (k === 1) {
            dx = -spacingMeters;
            dy = -spacingMeters;
          } else if (k === 2) {
            dx = spacingMeters;
            dy = -spacingMeters;
          } else if (k === 3) {
            dx = 0;
            dy = -2 * spacingMeters;
          } else {
            const side = k % 2 === 1 ? 1 : -1;
            const mag = Math.ceil(k / 2);
            dx = side * mag * spacingMeters;
            dy = -mag * spacingMeters;
          }
          break;
        }

        case 'ECHELON_LEFT': {
          // Diagonal stepped formation to the rear-left
          dx = -k * spacingMeters;
          dy = -k * spacingMeters;
          break;
        }

        case 'ECHELON_RIGHT': {
          // Diagonal stepped formation to the rear-right
          dx = k * spacingMeters;
          dy = -k * spacingMeters;
          break;
        }

        case 'CIRCLE': {
          // Equidistant circle surrounding the leader
          const totalFollowers = followerIds.length;
          const angle = (idx / totalFollowers) * 2 * Math.PI;
          dx = spacingMeters * Math.sin(angle);
          dy = spacingMeters * Math.cos(angle);
          break;
        }

        case 'GRID': {
          // 2D rectangular grid behind leader
          const cols = 2;
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          dx = (col === 0 ? -1 : 1) * (spacingMeters / 2);
          dy = -(row + 1) * spacingMeters;
          break;
        }

        case 'CUSTOM':
        default: {
          dx = (idx % 2 === 0 ? 1 : -1) * (idx + 1) * spacingMeters * 0.8;
          dy = -(idx + 1) * spacingMeters * 0.8;
          break;
        }
      }

      offsets.push({
        droneId: id,
        index: k,
        dxMeters: dx,
        dyMeters: dy,
        dzMeters: dz,
        isLeader: false
      });
    });

    return offsets;
  }

  /**
   * Projects local (dx, dy) offsets onto global WGS84 GPS (lat, lng, alt) space taking Leader heading into account.
   */
  public static calculateTargetPositions(
    leaderPos: { lat: number; lng: number; alt: number; heading: number },
    droneIds: string[],
    formationType: FormationType,
    spacingMeters: number = 25,
    leaderId: string = droneIds[0]
  ): FormationTarget[] {
    const offsets = this.calculateOffsets(droneIds, formationType, spacingMeters, leaderId);
    const headingRad = (leaderPos.heading * Math.PI) / 180;
    const cosH = Math.cos(headingRad);
    const sinH = Math.sin(headingRad);

    return offsets.map((off) => {
      if (off.isLeader) {
        return {
          droneId: off.droneId,
          index: 0,
          targetLat: leaderPos.lat,
          targetLng: leaderPos.lng,
          targetAlt: leaderPos.alt,
          headingDegrees: leaderPos.heading,
          dxMeters: 0,
          dyMeters: 0,
          isLeader: true
        };
      }

      // Rotate local dx (right) and dy (forward) by heading angle
      const rotX = off.dxMeters * cosH + off.dyMeters * sinH;
      const rotY = -off.dxMeters * sinH + off.dyMeters * cosH;

      // Project rotated displacements in meters to GPS coordinates
      const deltaLat = rotY / 111320;
      const deltaLng = rotX / (111320 * Math.cos((leaderPos.lat * Math.PI) / 180));

      const targetLat = +(leaderPos.lat + deltaLat).toFixed(6);
      const targetLng = +(leaderPos.lng + deltaLng).toFixed(6);
      const targetAlt = leaderPos.alt + off.dzMeters;

      return {
        droneId: off.droneId,
        index: off.index,
        targetLat,
        targetLng,
        targetAlt,
        headingDegrees: leaderPos.heading,
        dxMeters: off.dxMeters,
        dyMeters: off.dyMeters,
        isLeader: false
      };
    });
  }
}
