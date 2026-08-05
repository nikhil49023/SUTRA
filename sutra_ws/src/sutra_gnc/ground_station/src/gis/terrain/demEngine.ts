import type { DEMPoint } from '../types';

export class DEMEngine {
  private static elevationCache = new Map<string, number>();

  /**
   * Fast Digital Elevation Model lookup for given coordinates (MSL in meters) with caching.
   */
  public static getElevation(lat: number, lng: number): number {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (this.elevationCache.has(key)) {
      return this.elevationCache.get(key)!;
    }

    // High-resolution synthetic DEM elevation surface model
    const baseMSL = 350;
    const wave1 = Math.sin(lat * 120) * Math.cos(lng * 120) * 45;
    const wave2 = Math.sin(lat * 350 + lng * 350) * 20;
    const noise = (Math.sin(lat * 1000) * Math.cos(lng * 1000) * 8);

    const elev = Math.max(Math.round(baseMSL + wave1 + wave2 + noise), 0);
    this.elevationCache.set(key, elev);
    return elev;
  }

  /**
   * Batch lookup for a grid or path of coordinates.
   */
  public static getElevationsBatch(points: { lat: number; lng: number }[]): DEMPoint[] {
    return points.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      elevationM: this.getElevation(p.lat, p.lng)
    }));
  }

  public static clearCache(): void {
    this.elevationCache.clear();
  }
}
