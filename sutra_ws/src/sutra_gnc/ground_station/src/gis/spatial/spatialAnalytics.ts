import type { SpatialMetrics } from '../types';
import * as turf from '@turf/turf';

export class SpatialAnalyticsEngine {
  /**
   * Calculate distance in km between two coordinates.
   */
  public static calculateDistanceKm(
    p1: { lat: number; lng: number },
    p2: { lat: number; lng: number }
  ): number {
    const pt1 = turf.point([p1.lng, p1.lat]);
    const pt2 = turf.point([p2.lng, p2.lat]);
    return Math.round(turf.distance(pt1, pt2, { units: 'kilometers' }) * 100) / 100;
  }

  /**
   * Calculate initial bearing in degrees (0-360) from p1 to p2.
   */
  public static calculateBearingDegrees(
    p1: { lat: number; lng: number },
    p2: { lat: number; lng: number }
  ): number {
    const pt1 = turf.point([p1.lng, p1.lat]);
    const pt2 = turf.point([p2.lng, p2.lat]);
    const b = turf.bearing(pt1, pt2);
    return Math.round((b + 360) % 360);
  }

  /**
   * Calculate polygon area in square kilometers and hectares.
   */
  public static calculatePolygonArea(coords: [number, number][]): { areaKm2: number; areaHa: number } {
    if (!coords || coords.length < 3) {
      return { areaKm2: 0, areaHa: 0 };
    }

    // Ensure polygon loop is closed
    const ring = coords.map((c) => [c[1], c[0]]);
    if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
      ring.push(ring[0]);
    }

    const poly = turf.polygon([ring]);
    const areaM2 = turf.area(poly);
    const areaKm2 = Math.round((areaM2 / 1_000_000) * 1000) / 1000;
    const areaHa = Math.round((areaM2 / 10_000) * 10) / 10;

    return { areaKm2, areaHa };
  }

  /**
   * Calculate cumulative route length along waypoints.
   */
  public static calculateRouteLengthKm(waypoints: { lat: number; lng: number }[]): number {
    if (!waypoints || waypoints.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      total += this.calculateDistanceKm(waypoints[i], waypoints[i + 1]);
    }
    return Math.round(total * 100) / 100;
  }
}
