import * as turf from '@turf/turf';

export interface MapLayerConfig {
  id: string;
  name: string;
  type: 'TACTICAL_DARK' | 'SATELLITE' | 'TERRAIN' | 'ROAD';
  url: string;
  attribution: string;
}

export const MAP_LAYERS: MapLayerConfig[] = [
  {
    id: 'dark',
    name: 'Tactical Dark (CartoDB)',
    type: 'TACTICAL_DARK',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
  },
  {
    id: 'satellite',
    name: 'Mapbox Satellite Imagery',
    type: 'SATELLITE',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri, Maxar, Earthstar Geographics'
  },
  {
    id: 'terrain',
    name: 'OpenTopo Terrain',
    type: 'TERRAIN',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM'
  },
  {
    id: 'road',
    name: 'Mapbox Street Grid',
    type: 'ROAD',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors'
  }
];

export class GISService {
  /**
   * Calculates total distance of a route (given Array of Lat/Lng coordinates) in Kilometers
   */
  static calculateRouteDistance(coordinates: [number, number][]): number {
    if (coordinates.length < 2) return 0;
    const line = turf.lineString(coordinates.map(([lat, lng]) => [lng, lat]));
    return turf.length(line, { units: 'kilometers' });
  }

  /**
   * Calculates area of a closed polygon in Square Meters & Hectares
   */
  static calculatePolygonArea(polygonCoords: [number, number][]): { areaSqMeters: number; hectares: number } {
    if (polygonCoords.length < 3) return { areaSqMeters: 0, hectares: 0 };
    const closedCoords = [...polygonCoords];
    if (
      closedCoords[0][0] !== closedCoords[closedCoords.length - 1][0] ||
      closedCoords[0][1] !== closedCoords[closedCoords.length - 1][1]
    ) {
      closedCoords.push(closedCoords[0]);
    }

    const poly = turf.polygon([closedCoords.map(([lat, lng]) => [lng, lat])]);
    const areaSqMeters = turf.area(poly);
    return {
      areaSqMeters: Math.round(areaSqMeters),
      hectares: +(areaSqMeters / 10000).toFixed(2)
    };
  }

  /**
   * Check if a Lat/Lng point falls inside a polygon ring
   */
  static isPointInPolygon(point: [number, number], polygonCoords: [number, number][]): boolean {
    if (polygonCoords.length < 3) return false;
    const closedCoords = [...polygonCoords];
    if (
      closedCoords[0][0] !== closedCoords[closedCoords.length - 1][0] ||
      closedCoords[0][1] !== closedCoords[closedCoords.length - 1][1]
    ) {
      closedCoords.push(closedCoords[0]);
    }

    const pt = turf.point([point[1], point[0]]);
    const poly = turf.polygon([closedCoords.map(([lat, lng]) => [lng, lat])]);
    return turf.booleanPointInPolygon(pt, poly);
  }

  /**
   * Calculate bearing from point A to point B in degrees
   */
  static calculateBearing(start: [number, number], end: [number, number]): number {
    const ptA = turf.point([start[1], start[0]]);
    const ptB = turf.point([end[1], end[0]]);
    const bearing = turf.bearing(ptA, ptB);
    return (bearing + 360) % 360;
  }

  /**
   * Interpolates a point along a segment given a progress factor (0 to 1)
   */
  static interpolatePosition(start: [number, number], end: [number, number], factor: number): [number, number] {
    const lat = start[0] + (end[0] - start[0]) * factor;
    const lng = start[1] + (end[1] - start[1]) * factor;
    return [lat, lng];
  }

  /**
   * Check if a polygon ring is self-intersecting using turf.kinks
   */
  static isPolygonSelfIntersecting(polygonCoords: [number, number][]): boolean {
    if (polygonCoords.length < 3) return false;
    // Map [lat, lng] to [lng, lat] for GeoJSON
    let ring: [number, number][] = polygonCoords.map(([lat, lng]) => [lng, lat]);
    if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
      ring.push([ring[0][0], ring[0][1]]);
    }
    try {
      const poly = turf.polygon([ring]);
      const kinks = turf.kinks(poly);
      return kinks.features.length > 0;
    } catch (err) {
      return false;
    }
  }

  /**
   * Check if adding newPt creates a duplicate consecutive vertex
   */
  static isDuplicateConsecutiveVertex(lastPt: [number, number], newPt: [number, number]): boolean {
    const dist = Math.hypot(lastPt[0] - newPt[0], lastPt[1] - newPt[1]);
    return dist < 1e-6;
  }

  /**
   * Converts polygon coordinates [lat, lng][] into a standard closed GeoJSON Polygon Feature
   */
  static toGeoJSONPolygon(polygonCoords: [number, number][], properties: Record<string, any> = {}): GeoJSON.Feature<GeoJSON.Polygon> {
    let ring: [number, number][] = polygonCoords.map(([lat, lng]) => [lng, lat]);
    if (ring.length >= 3 && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
      ring.push([ring[0][0], ring[0][1]]);
    }
    return {
      type: 'Feature',
      properties,
      geometry: {
        type: 'Polygon',
        coordinates: [ring]
      }
    };
  }
}

