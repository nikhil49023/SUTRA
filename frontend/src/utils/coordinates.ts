/**
 * Geodetic distance, bearing, and bounding box calculations.
 */

const EARTH_RADIUS_M = 6371000.0;

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180.0;
  const dLon = ((lon2 - lon1) * Math.PI) / 180.0;
  const phi1 = (lat1 * Math.PI) / 180.0;
  const phi2 = (lat2 * Math.PI) / 180.0;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = (lat1 * Math.PI) / 180.0;
  const phi2 = (lat2 * Math.PI) / 180.0;
  const dLon = ((lon2 - lon1) * Math.PI) / 180.0;

  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);

  let bearing = (Math.atan2(y, x) * 180.0) / Math.PI;
  return (bearing + 360.0) % 360.0;
}

export function calculatePolygonArea(coords: [number, number][]): number {
  if (coords.length < 3) return 0;
  let total = 0;
  const len = coords.length;

  for (let i = 0; i < len; i++) {
    const p1 = coords[i];
    const p2 = coords[(i + 1) % len];
    const x1 = (p1[1] * Math.PI) / 180.0 * EARTH_RADIUS_M * Math.cos((p1[0] * Math.PI) / 180.0);
    const y1 = (p1[0] * Math.PI) / 180.0 * EARTH_RADIUS_M;
    const x2 = (p2[1] * Math.PI) / 180.0 * EARTH_RADIUS_M * Math.cos((p2[0] * Math.PI) / 180.0);
    const y2 = (p2[0] * Math.PI) / 180.0 * EARTH_RADIUS_M;
    total += x1 * y2 - x2 * y1;
  }

  return Math.abs(total) / 2.0;
}

export function calculatePerimeter(coords: [number, number][]): number {
  if (coords.length < 2) return 0;
  let dist = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    dist += haversineDistance(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]);
  }
  if (coords.length >= 3) {
    dist += haversineDistance(
      coords[coords.length - 1][0],
      coords[coords.length - 1][1],
      coords[0][0],
      coords[0][1]
    );
  }
  return dist;
}
