import type { TerrainElevationPoint } from './types';
import { GISService } from '../services/gisService';

export class TerrainService {
  /**
   * Generates terrain elevation profile along a flight line
   */
  static getTerrainProfile(start: [number, number], end: [number, number], sampleCount: number = 20): TerrainElevationPoint[] {
    const points: TerrainElevationPoint[] = [];
    const totalDistKm = GISService.calculateRouteDistance([start, end]);

    for (let i = 0; i <= sampleCount; i++) {
      const fraction = i / sampleCount;
      const lat = start[0] + (end[0] - start[0]) * fraction;
      const lng = start[1] + (end[1] - start[1]) * fraction;
      
      // Simulated DEM elevation model (base elevation 350m + terrain ripples)
      const elevationM = Math.round(350 + Math.sin(fraction * Math.PI * 4) * 85 + Math.cos(fraction * Math.PI * 2) * 45);
      const distanceFromStartKm = +(totalDistKm * fraction).toFixed(2);

      points.push({ lat, lng, elevationM, distanceFromStartKm });
    }

    return points;
  }
}
