import type { Waypoint } from '../../types';
import type { MissionValidationResult, ValidationIssue } from '../types';
import { BatteryEstimator } from './batteryEstimator';
import { geofenceStore } from '../../geofence/store/GeofenceStore';
import * as turf from '@turf/turf';

export class MissionValidator {
  public static validate(
    waypoints: Waypoint[],
    maxAltMeters: number = 400,
    minAltMeters: number = 10
  ): MissionValidationResult {
    const issues: ValidationIssue[] = [];

    // 1. Waypoint Count Validation
    const waypointCountValid = waypoints.length >= 2 && waypoints.length <= 200;
    if (waypoints.length < 2) {
      issues.push({
        id: 'wp-min-count',
        severity: 'ERROR',
        category: 'WAYPOINT',
        message: 'Mission must contain at least 2 waypoints.'
      });
    }

    // 2. Altitude Limits Check
    let maxAltValid = true;
    let minAltValid = true;
    waypoints.forEach((wp) => {
      if (wp.alt > maxAltMeters) {
        maxAltValid = false;
        issues.push({
          id: `wp-alt-high-${wp.id}`,
          severity: 'ERROR',
          category: 'ALTITUDE',
          message: `Waypoint #${wp.id} altitude (${wp.alt}m) exceeds maximum limit (${maxAltMeters}m).`,
          waypointId: wp.id
        });
      }
      if (wp.alt < minAltMeters) {
        minAltValid = false;
        issues.push({
          id: `wp-alt-low-${wp.id}`,
          severity: 'WARNING',
          category: 'ALTITUDE',
          message: `Waypoint #${wp.id} altitude (${wp.alt}m) is below minimum safety floor (${minAltMeters}m).`,
          waypointId: wp.id
        });
      }
    });

    // 3. Geofence Violations Check
    let geofenceViolationCount = 0;
    const activeGeofences = geofenceStore.getState().collection.features.filter((f) => f.properties?.visible);

    if (activeGeofences.length > 0) {
      waypoints.forEach((wp) => {
        const point = turf.point([wp.lng, wp.lat]);
        activeGeofences.forEach((fence) => {
          if (fence.properties?.type === 'NO_FLY') {
            const isInside = turf.booleanPointInPolygon(point, fence as any);
            if (isInside) {
              geofenceViolationCount++;
              issues.push({
                id: `geofence-breach-${wp.id}`,
                severity: 'ERROR',
                category: 'GEOFENCE',
                message: `Waypoint #${wp.id} intersects No-Fly Zone "${fence.properties.name}".`,
                waypointId: wp.id
              });
            }
          }
        });
      });
    }

    // 4. Mission Length & Battery Sufficiency
    const batteryReport = BatteryEstimator.calculate(waypoints);
    let missionLengthKm = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const p1 = turf.point([waypoints[i].lng, waypoints[i].lat]);
      const p2 = turf.point([waypoints[i + 1].lng, waypoints[i + 1].lat]);
      missionLengthKm += turf.distance(p1, p2, { units: 'kilometers' });
    }
    missionLengthKm = Math.round(missionLengthKm * 100) / 100;

    const batterySufficiency = batteryReport.isSafeToFly;
    if (!batterySufficiency) {
      issues.push({
        id: 'battery-insufficient',
        severity: 'ERROR',
        category: 'BATTERY',
        message: `Estimated battery consumption (${batteryReport.missionBatteryPercent}%) exceeds safe flight limits.`
      });
    }

    // 5. Communication Coverage
    const commCoveragePercent = Math.max(100 - missionLengthKm * 4, 60);
    if (commCoveragePercent < 70) {
      issues.push({
        id: 'comm-coverage-low',
        severity: 'WARNING',
        category: 'COMMUNICATION',
        message: `Radio communication signal strength drops below 70% at maximum range.`
      });
    }

    const rtlPossibility = batteryReport.remainingBatteryPercent >= 15;
    if (!rtlPossibility) {
      issues.push({
        id: 'rtl-risk',
        severity: 'ERROR',
        category: 'BATTERY',
        message: 'Insufficient battery remaining to guarantee Return-To-Launch (RTL).'
      });
    }

    const hasErrors = issues.some((i) => i.severity === 'ERROR');

    return {
      isValid: !hasErrors && waypointCountValid && maxAltValid && batterySufficiency,
      waypointCountValid,
      maxAltitudeValid: maxAltValid,
      minAltitudeValid: minAltValid,
      geofenceViolationCount,
      missionLengthKm,
      commCoveragePercent: Math.round(commCoveragePercent),
      batterySufficiency,
      rtlPossibility,
      issues,
      validatedAt: new Date().toISOString()
    };
  }
}
