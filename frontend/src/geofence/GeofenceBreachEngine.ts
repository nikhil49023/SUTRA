/**
 * Smart Horizon GCS — Real-Time 3D Geofence Breach & Proximity Warning Engine
 * Subsystem: Tactical Airspace Containment & Collision Avoidance
 */

import { Geofence, ZoneType } from '../types/geofence';

export type BreachSeverity = 'SECURE' | 'ADVISORY' | 'CAUTION' | 'WARNING' | 'CRITICAL_BREACH';

export interface DroneGeofenceProximity {
  drone_id: string;
  drone_name: string;
  geofence_id: string;
  geofence_name: string;
  zone_type: ZoneType;
  distance_to_boundary_m: number;
  time_to_breach_s: number | null; // null if moving away or stationary
  is_inside: boolean;
  is_breaching: boolean;
  altitude_status: 'BELOW_FLOOR' | 'ABOVE_CEILING' | 'WITHIN_ALTITUDE' | 'SAFE';
  severity: BreachSeverity;
  recommendation: string;
}

const EARTH_RADIUS_M = 6371000;

/**
 * Calculates geodesic distance in meters between two lat/lon coordinates using Haversine
 */
export function calculateGeodesicDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

/**
 * High-performance 2D Ray-Casting algorithm to determine if a point is inside a polygon
 */
export function isPointInPolygon(lat: number, lon: number, polygon: [number, number][]): boolean {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect = yi > lon !== yj > lon && lat < ((xj - xi) * (lon - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Computes minimum distance from a point to a line segment
 */
export function distanceToSegment(pLat: number, pLon: number, aLat: number, aLon: number, bLat: number, bLon: number): number {
  const l2 = Math.pow(bLat - aLat, 2) + Math.pow(bLon - aLon, 2);
  if (l2 === 0) return calculateGeodesicDistance(pLat, pLon, aLat, aLon);

  let t = ((pLat - aLat) * (bLat - aLat) + (pLon - aLon) * (bLon - aLon)) / l2;
  t = Math.max(0, Math.min(1, t));

  const projLat = aLat + t * (bLat - aLat);
  const projLon = aLon + t * (bLon - aLon);
  return calculateGeodesicDistance(pLat, pLon, projLat, projLon);
}

/**
 * Calculates shortest distance from a coordinate to a geofence boundary in meters
 */
export function getDistanceToGeofenceBoundary(lat: number, lon: number, geofence: Geofence): number {
  if (geofence.geometry_type === 'CIRCLE') {
    const center = geofence.center || (geofence.coordinates && geofence.coordinates[0]);
    if (!center) return 999999;
    const distToCenter = calculateGeodesicDistance(lat, lon, center[0], center[1]);
    return Math.abs(distToCenter - (geofence.radius ?? 200));
  }

  if (geofence.geometry_type === 'CORRIDOR' && geofence.coordinates && geofence.coordinates.length >= 2) {
    let minDist = 999999;
    const halfWidth = (geofence.corridor_width ?? 50) / 2;
    for (let i = 0; i < geofence.coordinates.length - 1; i++) {
      const p1 = geofence.coordinates[i];
      const p2 = geofence.coordinates[i + 1];
      const d = distanceToSegment(lat, lon, p1[0], p1[1], p2[0], p2[1]);
      minDist = Math.min(minDist, d);
    }
    return Math.abs(minDist - halfWidth);
  }

  if (geofence.coordinates && geofence.coordinates.length >= 3) {
    let minDist = 999999;
    const pts = geofence.coordinates;
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      const d = distanceToSegment(lat, lon, p1[0], p1[1], p2[0], p2[1]);
      minDist = Math.min(minDist, d);
    }
    return minDist;
  }

  return 999999;
}

/**
 * 3D Containment & Proximity Evaluation Engine
 */
export function evaluateDroneGeofenceProximity(
  drone: { id: string; name?: string; latitude: number; longitude: number; altitude: number; speed?: number; heading?: number; vx?: number; vy?: number },
  geofence: Geofence
): DroneGeofenceProximity {
  const droneName = drone.name || `UAV-${drone.id.slice(-4).toUpperCase()}`;
  const dLat = drone.latitude;
  const dLon = drone.longitude;
  const dAlt = drone.altitude;

  let isInside2D = false;

  if (geofence.geometry_type === 'CIRCLE') {
    const center = geofence.center || (geofence.coordinates && geofence.coordinates[0]);
    if (center) {
      const dist = calculateGeodesicDistance(dLat, dLon, center[0], center[1]);
      isInside2D = dist <= (geofence.radius ?? 200);
    }
  } else if (geofence.geometry_type === 'CORRIDOR' && geofence.coordinates && geofence.coordinates.length >= 2) {
    let minDist = 999999;
    for (let i = 0; i < geofence.coordinates.length - 1; i++) {
      const p1 = geofence.coordinates[i];
      const p2 = geofence.coordinates[i + 1];
      minDist = Math.min(minDist, distanceToSegment(dLat, dLon, p1[0], p1[1], p2[0], p2[1]));
    }
    isInside2D = minDist <= (geofence.corridor_width ?? 50) / 2;
  } else if (geofence.coordinates && geofence.coordinates.length >= 3) {
    isInside2D = isPointInPolygon(dLat, dLon, geofence.coordinates);
  }

  // 3D Altitude Envelope Evaluation
  const altMin = geofence.altitude_min ?? 0;
  const altMax = geofence.altitude_max ?? 120;
  let altitudeStatus: 'BELOW_FLOOR' | 'ABOVE_CEILING' | 'WITHIN_ALTITUDE' | 'SAFE' = 'WITHIN_ALTITUDE';
  if (dAlt < altMin) altitudeStatus = 'BELOW_FLOOR';
  else if (dAlt > altMax) altitudeStatus = 'ABOVE_CEILING';

  const isWithin3D = isInside2D && altitudeStatus === 'WITHIN_ALTITUDE';
  const boundaryDist = getDistanceToGeofenceBoundary(dLat, dLon, geofence);

  // Time to breach calculation based on velocity
  const speed = drone.speed ?? Math.sqrt(Math.pow(drone.vx || 0, 2) + Math.pow(drone.vy || 0, 2));
  let timeToBreach: number | null = null;
  if (speed > 0.5) {
    timeToBreach = boundaryDist / speed;
  }

  // Determine breach state & severity based on ZoneType
  let isBreaching = false;
  let severity: BreachSeverity = 'SECURE';
  let recommendation = 'Airspace safe. Maintain flight path.';

  const isExclusion = geofence.zone_type === 'NO_FLY' || geofence.zone_type === 'EXCLUSION';
  const isInclusion = geofence.zone_type === 'INCLUSION' || geofence.zone_type === 'SAFE';

  if (isExclusion) {
    if (isWithin3D) {
      isBreaching = true;
      severity = 'CRITICAL_BREACH';
      recommendation = `CRITICAL: ${droneName} breached ${geofence.name}! Immediate RTL / Repulsion engaged.`;
    } else if (boundaryDist < 15 || (timeToBreach !== null && timeToBreach < 4)) {
      severity = 'WARNING';
      recommendation = `WARNING: Impending breach of ${geofence.name} in ${timeToBreach ? timeToBreach.toFixed(1) : '<4'}s. Turn away.`;
    } else if (boundaryDist < 35 || (timeToBreach !== null && timeToBreach < 8)) {
      severity = 'CAUTION';
      recommendation = `CAUTION: Approaching restricted airspace boundary (${boundaryDist.toFixed(0)}m).`;
    } else if (boundaryDist < 60) {
      severity = 'ADVISORY';
      recommendation = `ADVISORY: Proximity alert (${boundaryDist.toFixed(0)}m). Monitor trajectory.`;
    }
  } else if (isInclusion) {
    if (!isWithin3D && geofence.enabled) {
      isBreaching = true;
      severity = 'CRITICAL_BREACH';
      recommendation = `CRITICAL: ${droneName} exited safe operating volume! RTL initiated.`;
    } else if (boundaryDist < 15 || (timeToBreach !== null && timeToBreach < 4)) {
      severity = 'WARNING';
      recommendation = `WARNING: Approaching safe boundary exit in ${timeToBreach ? timeToBreach.toFixed(1) : '<4'}s.`;
    } else if (boundaryDist < 30) {
      severity = 'CAUTION';
      recommendation = `CAUTION: Near boundary of safe operating area (${boundaryDist.toFixed(0)}m).`;
    }
  } else if (geofence.zone_type === 'WARNING') {
    if (isWithin3D) {
      severity = 'CAUTION';
      recommendation = `Operating inside warning perimeter (${geofence.name}).`;
    } else if (boundaryDist < 25) {
      severity = 'ADVISORY';
      recommendation = `Approaching warning buffer zone (${boundaryDist.toFixed(0)}m).`;
    }
  }

  return {
    drone_id: drone.id,
    drone_name: droneName,
    geofence_id: geofence.id,
    geofence_name: geofence.name,
    zone_type: geofence.zone_type,
    distance_to_boundary_m: boundaryDist,
    time_to_breach_s: timeToBreach,
    is_inside: isWithin3D,
    is_breaching: isBreaching,
    altitude_status: altitudeStatus,
    severity,
    recommendation,
  };
}
