import type { Waypoint } from '../../types';
import { SpatialAnalyticsEngine } from '../../gis/spatial/spatialAnalytics';

export class ETAEstimator {
  public static estimateETA(waypoints: Waypoint[], cruiseSpeedKmh: number = 40): {
    estimatedMinutes: number;
    etaTimestamp: string;
  } {
    const distKm = SpatialAnalyticsEngine.calculateRouteLengthKm(waypoints);
    const speedKmPerMin = Math.max(cruiseSpeedKmh / 60, 0.1);
    const minEst = Math.round((distKm / speedKmPerMin) * 10) / 10;

    const etaDate = new Date(Date.now() + minEst * 60 * 1000);

    return {
      estimatedMinutes: minEst,
      etaTimestamp: etaDate.toLocaleTimeString()
    };
  }
}
