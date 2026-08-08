import type { Waypoint } from '../../types';
import { SpatialAnalyticsEngine } from '../../gis/spatial/spatialAnalytics';

export class RoutePredictor {
  public static predictTrajectory(waypoints: Waypoint[]): {
    totalDistanceKm: number;
    estimatedLegs: number;
  } {
    const totalDist = SpatialAnalyticsEngine.calculateRouteLengthKm(waypoints);
    return {
      totalDistanceKm: totalDist,
      estimatedLegs: waypoints.length - 1
    };
  }
}
