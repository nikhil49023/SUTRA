import { DEMEngine } from './demEngine';

export interface GroundClearanceCheck {
  droneLat: number;
  droneLng: number;
  droneAltAGLM: number;
  terrainElevationMSLM: number;
  clearanceMarginM: number;
  isSafeClearance: boolean;
  isTerrainShadowed: boolean;
}

export class GroundClearanceEngine {
  /**
   * Check ground clearance and terrain shadowing for a drone position.
   */
  public static evaluateClearance(
    droneLat: number,
    droneLng: number,
    droneAltAGLM: number,
    minSafetyFloorM: number = 20
  ): GroundClearanceCheck {
    const terrainMSL = DEMEngine.getElevation(droneLat, droneLng);
    const clearanceM = droneAltAGLM;
    const isSafe = clearanceM >= minSafetyFloorM;

    // Terrain shadowing check against surrounding peaks
    const northPeak = DEMEngine.getElevation(droneLat + 0.003, droneLng);
    const eastPeak = DEMEngine.getElevation(droneLat, droneLng + 0.003);
    const maxSurrounding = Math.max(northPeak, eastPeak);

    const isShadowed = (terrainMSL + droneAltAGLM) < (maxSurrounding - 10);

    return {
      droneLat,
      droneLng,
      droneAltAGLM,
      terrainElevationMSLM: terrainMSL,
      clearanceMarginM: Math.round(clearanceM),
      isSafeClearance: isSafe,
      isTerrainShadowed: isShadowed
    };
  }
}
