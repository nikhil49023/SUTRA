import type { SwarmFormation } from './types';

export class FormationEngine {
  /**
   * Calculates 3D offset positions (in meters) relative to Swarm Leader for a follower index
   */
  static calculateFormationOffset(
    formation: SwarmFormation,
    followerIndex: number,
    spacingMeters: number = 25
  ): { dx: number; dy: number; dz: number } {
    const idx = followerIndex + 1; // 1-based offset index

    switch (formation) {
      case 'LINE_VEE':
        // V-formation: odd on left (-dx, -dy), even on right (+dx, -dy)
        const side = idx % 2 === 1 ? -1 : 1;
        const rank = Math.ceil(idx / 2);
        return {
          dx: side * rank * spacingMeters,
          dy: -rank * spacingMeters,
          dz: 0
        };

      case 'GRID_ARRAY':
        // 2x2 or 3x3 Grid Matrix
        const col = (idx - 1) % 3;
        const row = Math.floor((idx - 1) / 3);
        return {
          dx: (col - 1) * spacingMeters,
          dy: -row * spacingMeters,
          dz: 0
        };

      case 'ORBIT_RING':
        // Circular ring formation around leader
        const angleRad = ((idx - 1) * (2 * Math.PI / 4));
        return {
          dx: Math.round(Math.cos(angleRad) * spacingMeters * 1.5),
          dy: Math.round(Math.sin(angleRad) * spacingMeters * 1.5),
          dz: 0
        };

      case 'DELTA_CHEVRON':
      default:
        return {
          dx: (idx % 2 === 1 ? -1 : 1) * idx * spacingMeters * 0.8,
          dy: -idx * spacingMeters * 1.2,
          dz: idx * 5 // Tiered altitude offset
        };
    }
  }
}
