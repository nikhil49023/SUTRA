import { describe, it, expect } from 'vitest';
import { formatCoordinates, formatDistance, formatSpeed, formatDuration } from '../utils/formatting';
import { haversineDistance, calculateBearing, calculatePolygonArea } from '../utils/coordinates';

describe('SMART HORIZON GCS — Formatting & Geospatial Utilities', () => {
  it('formats coordinates in DD and DMS', () => {
    const lat = 37.774929;
    const lon = -122.419416;

    const dd = formatCoordinates(lat, lon, 'DD');
    expect(dd).toContain('+37.774929°');
    expect(dd).toContain('-122.419416°');

    const dms = formatCoordinates(lat, lon, 'DMS');
    expect(dms).toContain('37°46\'');
    expect(dms).toContain('N');
    expect(dms).toContain('122°25\'');
    expect(dms).toContain('W');
  });

  it('formats distances correctly', () => {
    expect(formatDistance(500)).toBe('500.0 m');
    expect(formatDistance(1500)).toBe('1.50 km');
  });

  it('formats flight durations correctly', () => {
    expect(formatDuration(45)).toBe('00:45');
    expect(formatDuration(125)).toBe('02:05');
    expect(formatDuration(3665)).toBe('01:01:05');
  });

  it('calculates haversine distance between points', () => {
    const p1: [number, number] = [37.7749, -122.4194];
    const p2: [number, number] = [37.7759, -122.4194]; // ~111m north

    const dist = haversineDistance(p1[0], p1[1], p2[0], p2[1]);
    expect(dist).toBeGreaterThan(100);
    expect(dist).toBeLessThan(120);
  });

  it('calculates bearing between coordinates', () => {
    const p1: [number, number] = [37.7749, -122.4194];
    const p2: [number, number] = [37.7759, -122.4194]; // due North

    const bearing = calculateBearing(p1[0], p1[1], p2[0], p2[1]);
    expect(Math.round(bearing)).toBe(0);
  });
});
