import type { Waypoint } from '../../types';

export interface AltitudeProfile {
  waypointId: number;
  altAGLMeters: number;
  altMSLMeters: number;
  terrainElevationMeters: number;
  clearanceMarginMeters: number;
  isSafeClearance: boolean;
}

export class AltitudePlanner {
  /**
   * Compute terrain-following altitude profile for waypoints.
   */
  public static computeAltitudeProfile(
    waypoints: Waypoint[],
    baseTerrainMSL: number = 350,
    minClearanceM: number = 20
  ): AltitudeProfile[] {
    return waypoints.map((wp) => {
      // Simulated elevation variation based on coordinates
      const terrainVariation = Math.sin(wp.lat * 100) * 15 + Math.cos(wp.lng * 100) * 10;
      const terrainElev = Math.max(Math.round(baseTerrainMSL + terrainVariation), 0);
      const altAGL = wp.alt;
      const altMSL = terrainElev + altAGL;
      const clearance = altAGL;
      const isSafe = clearance >= minClearanceM;

      return {
        waypointId: wp.id,
        altAGLMeters: altAGL,
        altMSLMeters: altMSL,
        terrainElevationMeters: terrainElev,
        clearanceMarginMeters: clearance,
        isSafeClearance: isSafe
      };
    });
  }

  /**
   * Apply terrain-following offset to keep constant AGL over terrain elevation changes.
   */
  public static applyTerrainFollowing(waypoints: Waypoint[], targetAGLM: number = 100): Waypoint[] {
    return waypoints.map((wp) => ({
      ...wp,
      alt: targetAGLM
    }));
  }
}
