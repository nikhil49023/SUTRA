import * as maplibregl from 'maplibre-gl';
import type { Waypoint } from '../../../types';

export class MapUtils {
  static getWaypointsBoundingBox(waypoints: Waypoint[]): maplibregl.LngLatBoundsLike | null {
    if (waypoints.length === 0) return null;
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    waypoints.forEach((wp) => {
      if (wp.lat < minLat) minLat = wp.lat;
      if (wp.lat > maxLat) maxLat = wp.lat;
      if (wp.lng < minLng) minLng = wp.lng;
      if (wp.lng > maxLng) maxLng = wp.lng;
    });
    return [
      [minLng - 0.005, minLat - 0.005],
      [maxLng + 0.005, maxLat + 0.005]
    ];
  }
}
