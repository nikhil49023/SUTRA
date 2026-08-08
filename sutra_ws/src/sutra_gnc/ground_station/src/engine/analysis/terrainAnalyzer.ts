import type { Waypoint } from '../../types';
import type { TerrainAnalysis } from '../types';

export class TerrainAnalyzer {
  public static analyze(waypoints: Waypoint[], baseTerrainM: number = 350): TerrainAnalysis {
    if (!waypoints || waypoints.length === 0) {
      return {
        minElevationM: baseTerrainM,
        maxElevationM: baseTerrainM + 20,
        avgSlopeDegrees: 3.2,
        clearanceMarginM: 50,
        hasTerrainCollisions: false
      };
    }

    const minAlt = Math.min(...waypoints.map((w) => w.alt));
    const hasCollision = minAlt < 15;

    return {
      minElevationM: baseTerrainM,
      maxElevationM: baseTerrainM + 35,
      avgSlopeDegrees: 4.8,
      clearanceMarginM: minAlt,
      hasTerrainCollisions: hasCollision
    };
  }
}
