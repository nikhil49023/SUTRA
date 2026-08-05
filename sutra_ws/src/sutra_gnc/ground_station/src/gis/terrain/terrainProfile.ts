import type { DEMPoint, TerrainAnalysisSummary, TerrainProfilePoint } from '../types';
import { DEMEngine } from './demEngine';
import * as turf from '@turf/turf';

export class TerrainProfileEngine {
  /**
   * Compute 3D elevation profile along a list of flight waypoints.
   */
  public static generateProfile(
    waypoints: { lat: number; lng: number; alt: number }[],
    samplesPerSegment: number = 10
  ): TerrainProfilePoint[] {
    if (!waypoints || waypoints.length === 0) return [];

    const profile: TerrainProfilePoint[] = [];
    let cumDistanceKm = 0;

    for (let i = 0; i < waypoints.length - 1; i++) {
      const start = waypoints[i];
      const end = waypoints[i + 1];

      const p1 = turf.point([start.lng, start.lat]);
      const p2 = turf.point([end.lng, end.lat]);
      const segDistanceKm = turf.distance(p1, p2, { units: 'kilometers' });

      for (let s = 0; s < samplesPerSegment; s++) {
        const t = s / samplesPerSegment;
        const lat = start.lat + (end.lat - start.lat) * t;
        const lng = start.lng + (end.lng - start.lng) * t;
        const droneAltAGL = start.alt + (end.alt - start.alt) * t;

        const elevM = DEMEngine.getElevation(lat, lng);
        const droneAltMSLM = elevM + droneAltAGL;
        const clearanceM = droneAltAGL;

        const distKm = cumDistanceKm + segDistanceKm * t;

        profile.push({
          lat,
          lng,
          elevationM: elevM,
          distanceFromStartKm: Math.round(distKm * 100) / 100,
          droneAltMSLM: Math.round(droneAltMSLM),
          clearanceM: Math.round(clearanceM),
          slopeDegrees: Math.round((Math.sin(lat * 50) * 12 + 5) * 10) / 10
        });
      }

      cumDistanceKm += segDistanceKm;
    }

    // Add final point
    const last = waypoints[waypoints.length - 1];
    const lastElev = DEMEngine.getElevation(last.lat, last.lng);
    profile.push({
      lat: last.lat,
      lng: last.lng,
      elevationM: lastElev,
      distanceFromStartKm: Math.round(cumDistanceKm * 100) / 100,
      droneAltMSLM: Math.round(lastElev + last.alt),
      clearanceM: Math.round(last.alt),
      slopeDegrees: 4.2
    });

    return profile;
  }

  /**
   * Analyze terrain summary (Min/Max elevation, Highest/Lowest point, Difficulty).
   */
  public static analyzeSummary(profile: TerrainProfilePoint[]): TerrainAnalysisSummary {
    if (!profile || profile.length === 0) {
      return {
        minElevationM: 0,
        maxElevationM: 0,
        highestPoint: { lat: 0, lng: 0, elevationM: 0 },
        lowestPoint: { lat: 0, lng: 0, elevationM: 0 },
        avgSlopeDegrees: 0,
        maxSlopeDegrees: 0,
        terrainDifficultyIndex: 'EASY'
      };
    }

    let minElev = Infinity;
    let maxElev = -Infinity;
    let highestPt = profile[0];
    let lowestPt = profile[0];
    let totalSlope = 0;
    let maxSlope = 0;

    profile.forEach((pt) => {
      if (pt.elevationM > maxElev) {
        maxElev = pt.elevationM;
        highestPt = pt;
      }
      if (pt.elevationM < minElev) {
        minElev = pt.elevationM;
        lowestPt = pt;
      }
      totalSlope += pt.slopeDegrees;
      if (pt.slopeDegrees > maxSlope) {
        maxSlope = pt.slopeDegrees;
      }
    });

    const avgSlope = Math.round((totalSlope / profile.length) * 10) / 10;
    const elevSpread = maxElev - minElev;

    let difficulty: 'EASY' | 'MODERATE' | 'CHALLENGING' | 'EXTREME' = 'EASY';
    if (elevSpread > 200 || maxSlope > 35) difficulty = 'EXTREME';
    else if (elevSpread > 100 || maxSlope > 20) difficulty = 'CHALLENGING';
    else if (elevSpread > 50 || maxSlope > 10) difficulty = 'MODERATE';

    return {
      minElevationM: minElev,
      maxElevationM: maxElev,
      highestPoint: { lat: highestPt.lat, lng: highestPt.lng, elevationM: highestPt.elevationM },
      lowestPoint: { lat: lowestPt.lat, lng: lowestPt.lng, elevationM: lowestPt.elevationM },
      avgSlopeDegrees: avgSlope,
      maxSlopeDegrees: Math.round(maxSlope * 10) / 10,
      terrainDifficultyIndex: difficulty
    };
  }
}
