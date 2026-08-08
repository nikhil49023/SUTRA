import type { DEMPoint, LineOfSightResult } from '../types';
import { DEMEngine } from '../terrain/demEngine';
import * as turf from '@turf/turf';

export class LineOfSightEngine {
  /**
   * Calculate 3D raycasting line of sight between Observer (GCS / Target) and Drone.
   */
  public static calculateLOS(
    observer: { lat: number; lng: number; altMSLM: number },
    target: { lat: number; lng: number; altMSLM: number },
    samples: number = 20
  ): LineOfSightResult {
    const p1 = turf.point([observer.lng, observer.lat]);
    const p2 = turf.point([target.lng, target.lat]);
    const distanceKm = turf.distance(p1, p2, { units: 'kilometers' });

    let hasClearLOS = true;
    let obstructionPoint: DEMPoint | undefined = undefined;
    let minFresnelClearanceM = Infinity;

    for (let i = 1; i < samples; i++) {
      const t = i / samples;
      const lat = observer.lat + (target.lat - observer.lat) * t;
      const lng = observer.lng + (target.lng - observer.lng) * t;

      // 3D Ray Line MSL Altitude at step t
      const rayAltMSL = observer.altMSLM + (target.altMSLM - observer.altMSLM) * t;

      // Actual terrain MSL at step t
      const terrainElevMSL = DEMEngine.getElevation(lat, lng);

      // Fresnel Zone radius calculation for 2.4 GHz signal (approx)
      const d1Km = distanceKm * t;
      const d2Km = distanceKm * (1 - t);
      const fresnelRadiusM = 8.657 * Math.sqrt((d1Km * d2Km) / (2.4 * (distanceKm || 1)));

      const clearanceM = rayAltMSL - terrainElevMSL;
      if (clearanceM < minFresnelClearanceM) {
        minFresnelClearanceM = clearanceM;
      }

      if (rayAltMSL <= terrainElevMSL + 2) {
        hasClearLOS = false;
        if (!obstructionPoint) {
          obstructionPoint = {
            lat,
            lng,
            elevationM: terrainElevMSL
          };
        }
      }
    }

    // Maximum Radio Horizon calculation (Km)
    const hGcsM = Math.max(observer.altMSLM - DEMEngine.getElevation(observer.lat, observer.lng), 5);
    const hDroneM = Math.max(target.altMSLM - DEMEngine.getElevation(target.lat, target.lng), 5);
    const radioHorizonKm = Math.round((3.57 * (Math.sqrt(hGcsM) + Math.sqrt(hDroneM))) * 10) / 10;

    return {
      hasClearLOS,
      distanceKm: Math.round(distanceKm * 100) / 100,
      obstructionPoint,
      maxFresnelZoneClearanceM: Math.round(minFresnelClearanceM * 10) / 10,
      radioHorizonKm
    };
  }
}
