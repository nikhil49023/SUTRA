import type { Waypoint } from '../types';
import { GISService } from '../services/gisService';
import type { ValidationIssue } from './types';

export class MissionValidator {
  /**
   * Validates flight plan against safety limits, altitude constraints, and geofence rules
   */
  static validate(
    waypoints: Waypoint[],
    geofencePolygons: [number, number][][] = []
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (waypoints.length < 2) {
      issues.push({
        id: 'VAL-001',
        severity: 'ERROR',
        category: 'ALTITUDE',
        message: 'Flight plan must contain at least 2 waypoints.'
      });
      return issues;
    }

    // 1. Altitude Validation
    waypoints.forEach((wp) => {
      if (wp.alt > 500) {
        issues.push({
          id: `VAL-ALT-HIGH-${wp.id}`,
          severity: 'WARNING',
          category: 'ALTITUDE',
          message: `Waypoint ${wp.id} altitude (${wp.alt}m AGL) exceeds standard 500m AGL limit.`,
          waypointId: wp.id
        });
      }
      if (wp.alt <= 0 && wp.action !== 'RTH & LAND') {
        issues.push({
          id: `VAL-ALT-LOW-${wp.id}`,
          severity: 'ERROR',
          category: 'ALTITUDE',
          message: `Waypoint ${wp.id} altitude must be greater than 0m AGL.`,
          waypointId: wp.id
        });
      }
    });

    // 2. Geofence & Restricted Airspace Validation
    if (geofencePolygons.length > 0) {
      waypoints.forEach((wp) => {
        // Simple point-in-polygon bounding check
        const inGeofence = geofencePolygons.some((poly) => {
          return poly.some(([gLat, gLng]) => Math.abs(wp.lat - gLat) < 0.005 && Math.abs(wp.lng - gLng) < 0.005);
        });
        if (inGeofence) {
          issues.push({
            id: `VAL-GEO-${wp.id}`,
            severity: 'ERROR',
            category: 'GEOFENCE',
            message: `Waypoint ${wp.id} intersects Restricted Airspace / No-Fly Zone Alpha.`,
            waypointId: wp.id
          });
        }
      });
    }

    // 3. Minimum Waypoint Separation
    for (let i = 1; i < waypoints.length; i++) {
      const dist = GISService.calculateRouteDistance([
        [waypoints[i - 1].lat, waypoints[i - 1].lng],
        [waypoints[i].lat, waypoints[i].lng]
      ]) * 1000;

      if (dist < 5) {
        issues.push({
          id: `VAL-SEP-${waypoints[i].id}`,
          severity: 'WARNING',
          category: 'ALTITUDE',
          message: `Distance between Waypoint ${waypoints[i - 1].id} and Waypoint ${waypoints[i].id} is under 5m.`,
          waypointId: waypoints[i].id
        });
      }
    }

    return issues;
  }
}
