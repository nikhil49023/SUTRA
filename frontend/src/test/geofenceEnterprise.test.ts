/**
 * Smart Horizon GCS — Enterprise Geofence & Airspace Engine Test Suite
 */

import { describe, it, expect } from 'vitest';
import {
  calculateGeodesicDistance,
  isPointInPolygon,
  getDistanceToGeofenceBoundary,
  evaluateDroneGeofenceProximity,
} from '../geofence/GeofenceBreachEngine';
import { AIRSPACE_PRESETS } from '../geofence/GeofencePresets';
import { GeofenceFormatService } from '../geofence/GeofenceFormatService';
import { Geofence } from '../types/geofence';

describe('SMART HORIZON GCS — Enterprise Geofence & 3D Containment Suite', () => {
  const mockPolygonGf: Geofence = {
    id: 'gf-test-poly',
    name: 'Tactical Exclusion Polygon',
    zone_type: 'NO_FLY',
    geometry_type: 'POLYGON',
    coordinates: [
      [37.77, -122.42],
      [37.78, -122.42],
      [37.78, -122.41],
      [37.77, -122.41],
    ],
    altitude_min: 0,
    altitude_max: 120,
    priority: 5,
    enabled: true,
    visible: true,
  };

  const mockCircleGf: Geofence = {
    id: 'gf-test-circle',
    name: 'Safe Zone Radial',
    zone_type: 'SAFE',
    geometry_type: 'CIRCLE',
    coordinates: [[37.775, -122.415]],
    center: [37.775, -122.415],
    radius: 500,
    altitude_min: 10,
    altitude_max: 100,
    priority: 4,
    enabled: true,
    visible: true,
  };

  it('TEST 1: High-precision Haversine & Geodesic Distance calculations', () => {
    const dist = calculateGeodesicDistance(37.7749, -122.4194, 37.7749, -122.4094);
    expect(dist).toBeGreaterThan(800);
    expect(dist).toBeLessThan(950);
  });

  it('TEST 2: Ray-casting Point-in-Polygon containment detection', () => {
    const inside = isPointInPolygon(37.775, -122.415, mockPolygonGf.coordinates);
    expect(inside).toBe(true);

    const outside = isPointInPolygon(37.76, -122.40, mockPolygonGf.coordinates);
    expect(outside).toBe(false);
  });

  it('TEST 3: Boundary distance calculation for Circles and Polygons', () => {
    const circleDist = getDistanceToGeofenceBoundary(37.775, -122.415, mockCircleGf);
    expect(circleDist).toBeCloseTo(500, 0); // At center, distance to edge is radius (500m)

    const polyDist = getDistanceToGeofenceBoundary(37.775, -122.415, mockPolygonGf);
    expect(polyDist).toBeGreaterThan(0);
  });

  it('TEST 4: Real-time 3D containment & Breach detection with TTB projection', () => {
    // Drone inside NO_FLY polygon at 50m AGL
    const breachEvaluation = evaluateDroneGeofenceProximity(
      {
        id: 'uav-101',
        name: 'Alpha-1',
        latitude: 37.775,
        longitude: -122.415,
        altitude: 50,
        speed: 12.0,
        heading: 90,
      },
      mockPolygonGf
    );

    expect(breachEvaluation.is_inside).toBe(true);
    expect(breachEvaluation.is_breaching).toBe(true);
    expect(breachEvaluation.severity).toBe('CRITICAL_BREACH');
    expect(breachEvaluation.recommendation).toContain('CRITICAL');
  });

  it('TEST 5: Tactical Airspace Preset generation centered on fleet coordinate', () => {
    expect(AIRSPACE_PRESETS.length).toBeGreaterThanOrEqual(5);

    const airportPreset = AIRSPACE_PRESETS.find((p) => p.id === 'preset-airport-ctr');
    expect(airportPreset).toBeDefined();

    const generated = airportPreset!.generator(37.7749, -122.4194);
    expect(generated.radius).toBe(5000);
    expect(generated.zone_type).toBe('NO_FLY');
    expect(generated.center).toEqual([37.7749, -122.4194]);
  });

  it('TEST 6: Multi-format Spatial Data Exchange (GeoJSON, KML, WKT)', () => {
    const gfs = [mockPolygonGf, mockCircleGf];

    // GeoJSON Export
    const geojsonStr = GeofenceFormatService.exportToGeoJSON(gfs);
    const parsed = JSON.parse(geojsonStr);
    expect(parsed.type).toBe('FeatureCollection');
    expect(parsed.features.length).toBe(2);

    // KML Export
    const kmlStr = GeofenceFormatService.exportToKML(gfs);
    expect(kmlStr).toContain('<kml');
    expect(kmlStr).toContain('Tactical Exclusion Polygon');

    // WKT Export
    const wktStr = GeofenceFormatService.exportToWKT(gfs);
    expect(wktStr).toContain('POLYGON((');
    expect(wktStr).toContain('POINT(');

    // GeoJSON Import Parsing
    const validation = GeofenceFormatService.parseGeoJSON(geojsonStr);
    expect(validation.valid).toBe(true);
    expect(validation.geofences.length).toBe(2);
  });
});
