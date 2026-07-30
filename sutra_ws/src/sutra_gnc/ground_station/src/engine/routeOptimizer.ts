import type { Waypoint } from '../types';
import { GISService } from '../services/gisService';

export class RouteOptimizer {
  /**
   * Optimizes waypoint sequence by removing redundant points and smoothing turn angles
   */
  static optimizeWaypoints(waypoints: Waypoint[]): Waypoint[] {
    if (waypoints.length <= 3) return waypoints;

    const optimized: Waypoint[] = [waypoints[0]];

    for (let i = 1; i < waypoints.length - 1; i++) {
      const prev = waypoints[i - 1];
      const curr = waypoints[i];
      const next = waypoints[i + 1];

      const bearing1 = GISService.calculateBearing([prev.lat, prev.lng], [curr.lat, curr.lng]);
      const bearing2 = GISService.calculateBearing([curr.lat, curr.lng], [next.lat, next.lng]);

      // If heading change is negligible (< 2 degrees) and altitude is equal, skip redundant point
      const angleDiff = Math.abs(bearing1 - bearing2);
      if ((angleDiff < 2 || angleDiff > 358) && prev.alt === curr.alt) {
        continue; // Skip redundant linear point
      }
      optimized.push(curr);
    }

    optimized.push(waypoints[waypoints.length - 1]);

    // Re-index waypoint IDs
    return optimized.map((wp, idx) => ({ ...wp, id: idx + 1 }));
  }
}
