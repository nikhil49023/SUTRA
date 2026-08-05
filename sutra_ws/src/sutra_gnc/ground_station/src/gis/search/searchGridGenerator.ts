import type { GeneratedSearchGrid, SearchGridCell, SearchPatternType } from '../types';
import * as turf from '@turf/turf';

export class SearchGridGenerator {
  /**
   * Generate tactical search grid and waypoint path for SAR / Recon missions.
   */
  public static generateGrid(
    patternType: SearchPatternType,
    centerLat: number,
    centerLng: number,
    radiusMeters: number = 500,
    altitudeM: number = 80
  ): GeneratedSearchGrid {
    const cells: SearchGridCell[] = [];
    const waypoints: { lat: number; lng: number; alt: number }[] = [];

    const deltaLat = radiusMeters / 111320;
    const deltaLng = radiusMeters / (111320 * Math.cos((centerLat * Math.PI) / 180));

    switch (patternType) {
      case 'GRID':
      case 'LAWN_MOWER': {
        const numRows = 5;
        for (let r = 0; r < numRows; r++) {
          const rLat = centerLat + (r - 2) * (deltaLat / 2);
          if (r % 2 === 0) {
            waypoints.push({ lat: rLat, lng: centerLng - deltaLng, alt: altitudeM });
            waypoints.push({ lat: rLat, lng: centerLng + deltaLng, alt: altitudeM });
          } else {
            waypoints.push({ lat: rLat, lng: centerLng + deltaLng, alt: altitudeM });
            waypoints.push({ lat: rLat, lng: centerLng - deltaLng, alt: altitudeM });
          }
        }
        break;
      }
      case 'SPIRAL': {
        const numLoops = 4;
        const ptsPerLoop = 8;
        for (let i = 0; i < numLoops * ptsPerLoop; i++) {
          const rFrac = (i + 1) / (numLoops * ptsPerLoop);
          const angle = i * ((2 * Math.PI) / ptsPerLoop);
          waypoints.push({
            lat: centerLat + Math.sin(angle) * deltaLat * rFrac,
            lng: centerLng + Math.cos(angle) * deltaLng * rFrac,
            alt: altitudeM
          });
        }
        break;
      }
      case 'SECTOR': {
        const sectors = 6;
        for (let i = 0; i < sectors; i++) {
          const angle = i * ((2 * Math.PI) / sectors);
          waypoints.push({ lat: centerLat, lng: centerLng, alt: altitudeM });
          waypoints.push({
            lat: centerLat + Math.sin(angle) * deltaLat,
            lng: centerLng + Math.cos(angle) * deltaLng,
            alt: altitudeM
          });
        }
        break;
      }
      case 'CORRIDOR': {
        for (let i = -3; i <= 3; i++) {
          waypoints.push({
            lat: centerLat + i * (deltaLat / 2),
            lng: centerLng + i * (deltaLng / 2),
            alt: altitudeM
          });
        }
        break;
      }
      case 'EXPANDING_SQUARE': {
        let currentStep = 1;
        let cLat = centerLat;
        let cLng = centerLng;
        waypoints.push({ lat: cLat, lng: cLng, alt: altitudeM });

        const dirs = [
          [0, 1],
          [1, 0],
          [0, -1],
          [-1, 0]
        ];
        for (let i = 0; i < 6; i++) {
          const dir = dirs[i % 4];
          const distFactor = Math.ceil((i + 1) / 2) * 0.2;
          cLat += dir[0] * deltaLat * distFactor;
          cLng += dir[1] * deltaLng * distFactor;
          waypoints.push({ lat: cLat, lng: cLng, alt: altitudeM });
        }
        break;
      }
    }

    // Generate grid cell bounding polygons
    const cellSizeLat = deltaLat / 2;
    const cellSizeLng = deltaLng / 2;
    let cellId = 1;

    for (let r = -1; r <= 1; r++) {
      for (let c = -1; c <= 1; c++) {
        const minLat = centerLat + r * cellSizeLat;
        const maxLat = minLat + cellSizeLat;
        const minLng = centerLng + c * cellSizeLng;
        const maxLng = minLng + cellSizeLng;

        cells.push({
          id: `cell-${cellId++}`,
          bounds: [
            [minLat, minLng],
            [minLat, maxLng],
            [maxLat, maxLng],
            [maxLat, minLng]
          ],
          center: [(minLat + maxLat) / 2, (minLng + maxLng) / 2],
          scanned: false,
          priority: r === 0 && c === 0 ? 'HIGH' : 'MEDIUM'
        });
      }
    }

    const totalAreaKm2 = Math.round((Math.PI * Math.pow(radiusMeters / 1000, 2)) * 100) / 100;
    const estTimeMin = Math.round((waypoints.length * 1.5) * 10) / 10;

    return {
      patternType,
      cells,
      pathWaypoints: waypoints,
      totalAreaKm2,
      estimatedSearchTimeMin: estTimeMin
    };
  }
}
