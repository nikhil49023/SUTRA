import type { Waypoint } from '../../types';
import type { RouteOptimizationResult } from '../types';
import * as turf from '@turf/turf';

export class RouteOptimizer {
  /**
   * Optimize waypoint path for minimal distance, smooth turns, and energy efficiency.
   */
  public static optimize(waypoints: Waypoint[]): RouteOptimizationResult {
    if (!waypoints || waypoints.length <= 2) {
      return {
        optimizedWaypoints: [...waypoints],
        originalDistanceKm: 0,
        optimizedDistanceKm: 0,
        distanceSavedKm: 0,
        totalTurnAngleDegrees: 0,
        estimatedDurationMin: 0,
        estimatedBatterySavingsPercent: 0
      };
    }

    const originalDistanceKm = this.calculateTotalDistanceKm(waypoints);
    const originalTurnAngles = this.calculateTotalTurnAngles(waypoints);

    // Nearest-neighbor trajectory smoothing keeping start and end fixed
    const optimized = this.smoothPath(waypoints);
    const optimizedDistanceKm = this.calculateTotalDistanceKm(optimized);
    const optimizedTurnAngles = this.calculateTotalTurnAngles(optimized);

    const distanceSavedKm = Math.max(Math.round((originalDistanceKm - optimizedDistanceKm) * 100) / 100, 0);
    const batterySavings = Math.min(Math.round((distanceSavedKm / (originalDistanceKm || 1)) * 100 * 10) / 10, 25);
    const durationMin = Math.round((optimizedDistanceKm / 0.6) * 10) / 10; // Assuming ~36 km/h cruise

    return {
      optimizedWaypoints: optimized,
      originalDistanceKm: Math.round(originalDistanceKm * 100) / 100,
      optimizedDistanceKm: Math.round(optimizedDistanceKm * 100) / 100,
      distanceSavedKm,
      totalTurnAngleDegrees: Math.round(optimizedTurnAngles),
      estimatedDurationMin: durationMin,
      estimatedBatterySavingsPercent: batterySavings
    };
  }

  private static smoothPath(waypoints: Waypoint[]): Waypoint[] {
    if (waypoints.length <= 2) return [...waypoints];

    const result: Waypoint[] = [waypoints[0]];
    const unvisited = waypoints.slice(1, waypoints.length - 1);

    let current = waypoints[0];

    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const p1 = turf.point([current.lng, current.lat]);
        const p2 = turf.point([unvisited[i].lng, unvisited[i].lat]);
        const dist = turf.distance(p1, p2);

        if (dist < minDistance) {
          minDistance = dist;
          nearestIdx = i;
        }
      }

      const nextWp = unvisited.splice(nearestIdx, 1)[0];
      result.push({
        ...nextWp,
        id: result.length + 1
      });
      current = nextWp;
    }

    // Append destination endpoint
    const last = waypoints[waypoints.length - 1];
    result.push({
      ...last,
      id: result.length + 1
    });

    return result;
  }

  private static calculateTotalDistanceKm(waypoints: Waypoint[]): number {
    let total = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const p1 = turf.point([waypoints[i].lng, waypoints[i].lat]);
      const p2 = turf.point([waypoints[i + 1].lng, waypoints[i + 1].lat]);
      total += turf.distance(p1, p2, { units: 'kilometers' });
    }
    return total;
  }

  private static calculateTotalTurnAngles(waypoints: Waypoint[]): number {
    let totalAngle = 0;
    for (let i = 1; i < waypoints.length - 1; i++) {
      const b1 = turf.bearing(
        turf.point([waypoints[i - 1].lng, waypoints[i - 1].lat]),
        turf.point([waypoints[i].lng, waypoints[i].lat])
      );
      const b2 = turf.bearing(
        turf.point([waypoints[i].lng, waypoints[i].lat]),
        turf.point([waypoints[i + 1].lng, waypoints[i + 1].lat])
      );
      let diff = Math.abs(b2 - b1);
      if (diff > 180) diff = 360 - diff;
      totalAngle += diff;
    }
    return totalAngle;
  }
}
