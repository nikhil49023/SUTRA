import type { VisibilityMapPoint } from '../types';
import { DEMEngine } from '../terrain/demEngine';
import { LineOfSightEngine } from './lineOfSightEngine';

export class RadioHorizonEngine {
  /**
   * Calculate line-of-sight visibility map grid around GCS station.
   */
  public static generateVisibilityGrid(
    gcsLat: number,
    gcsLng: number,
    gcsAltAGLM: number = 10,
    droneTargetAltAGLM: number = 100,
    gridSize: number = 5,
    stepDegrees: number = 0.003
  ): VisibilityMapPoint[] {
    const grid: VisibilityMapPoint[] = [];
    const gcsElevMSL = DEMEngine.getElevation(gcsLat, gcsLng) + gcsAltAGLM;

    const half = Math.floor(gridSize / 2);
    for (let r = -half; r <= half; r++) {
      for (let c = -half; c <= half; c++) {
        const lat = gcsLat + r * stepDegrees;
        const lng = gcsLng + c * stepDegrees;

        const targetElevMSL = DEMEngine.getElevation(lat, lng) + droneTargetAltAGLM;
        const los = LineOfSightEngine.calculateLOS(
          { lat: gcsLat, lng: gcsLng, altMSLM: gcsElevMSL },
          { lat, lng, altMSLM: targetElevMSL },
          10
        );

        grid.push({
          lat,
          lng,
          isVisible: los.hasClearLOS,
          elevationM: DEMEngine.getElevation(lat, lng)
        });
      }
    }

    return grid;
  }
}
