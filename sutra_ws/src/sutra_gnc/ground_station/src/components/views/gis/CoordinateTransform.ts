import type { Waypoint } from '../../../types';

export class CoordinateTransform {
  /**
   * Converts array of Waypoints to GeoJSON LineString coordinates [[lng, lat], ...]
   */
  static waypointsToGeoJSONLineString(waypoints: Waypoint[]): [number, number][] {
    return waypoints.map((wp) => [wp.lng, wp.lat]);
  }

  /**
   * Converts array of Lat/Lng pairs to GeoJSON Polygon ring [[lng, lat], ...]
   */
  static polygonToGeoJSONRing(points: [number, number][]): [number, number][] {
    if (points.length < 3) return [];
    const closed = points.map(([lat, lng]) => [lng, lat] as [number, number]);
    // Close ring if not closed
    if (closed[0][0] !== closed[closed.length - 1][0] || closed[0][1] !== closed[closed.length - 1][1]) {
      closed.push([closed[0][0], closed[0][1]]);
    }
    return closed;
  }
}
