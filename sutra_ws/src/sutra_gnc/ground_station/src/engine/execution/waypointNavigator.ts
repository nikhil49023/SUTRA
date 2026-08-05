import type { Waypoint } from '../../types';
import * as turf from '@turf/turf';

export interface NavigationTarget {
  targetWaypoint: Waypoint;
  targetIndex: number;
  distanceToTargetMeters: number;
  desiredHeadingDegrees: number;
  isFinalWaypoint: boolean;
  hasArrived: boolean;
}

export class WaypointNavigator {
  private arrivalRadiusMeters: number = 12;

  public getNavigationTarget(
    currentPos: { lat: number; lng: number; alt: number },
    waypoints: Waypoint[],
    currentIndex: number
  ): NavigationTarget | null {
    if (!waypoints || waypoints.length === 0 || currentIndex >= waypoints.length) {
      return null;
    }

    const targetWp = waypoints[currentIndex];
    const p1 = turf.point([currentPos.lng, currentPos.lat]);
    const p2 = turf.point([targetWp.lng, targetWp.lat]);

    const distanceKm = turf.distance(p1, p2, { units: 'kilometers' });
    const distanceMeters = distanceKm * 1000;
    const bearing = turf.bearing(p1, p2);
    const desiredHeading = (bearing + 360) % 360;

    const hasArrived = distanceMeters <= this.arrivalRadiusMeters;
    const isFinalWaypoint = currentIndex === waypoints.length - 1;

    return {
      targetWaypoint: targetWp,
      targetIndex: currentIndex,
      distanceToTargetMeters: Math.round(distanceMeters * 10) / 10,
      desiredHeadingDegrees: Math.round(desiredHeading * 10) / 10,
      isFinalWaypoint,
      hasArrived
    };
  }

  public setArrivalRadius(meters: number): void {
    this.arrivalRadiusMeters = Math.max(meters, 2);
  }
}
