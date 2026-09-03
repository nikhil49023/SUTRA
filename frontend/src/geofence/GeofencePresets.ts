/**
 * Smart Horizon GCS — Tactical Airspace Preset Templates
 * One-click generation of military, industrial, and civil aviation restricted zones.
 */

import { Geofence, ZoneType, GeometryType } from '../types/geofence';

export interface GeofencePreset {
  id: string;
  title: string;
  description: string;
  category: 'AVIATION' | 'TACTICAL' | 'CIVIL' | 'CORRIDOR';
  zone_type: ZoneType;
  geometry_type: GeometryType;
  default_alt_min: number;
  default_alt_max: number;
  icon: string;
  generator: (centerLat: number, centerLon: number) => Partial<Geofence>;
}

export const AIRSPACE_PRESETS: GeofencePreset[] = [
  {
    id: 'preset-airport-ctr',
    title: 'Airport Class D (CTR) NFZ',
    description: 'Standard 5 km radius aerodrome control zone with 0m-500m AGL ceiling.',
    category: 'AVIATION',
    zone_type: 'NO_FLY',
    geometry_type: 'CIRCLE',
    default_alt_min: 0,
    default_alt_max: 500,
    icon: 'Plane',
    generator: (lat, lon) => ({
      name: 'Airport Class D CTR (5km)',
      zone_type: 'NO_FLY',
      geometry_type: 'CIRCLE',
      center: [lat, lon],
      radius: 5000,
      altitude_min: 0,
      altitude_max: 500,
      priority: 5,
      enabled: true,
      visible: true,
    }),
  },
  {
    id: 'preset-tfr-stadium',
    title: 'Stadium TFR (1 NM Radial)',
    description: 'FAA style Temporary Flight Restriction: 1.85 km radius, 0-300m AGL.',
    category: 'CIVIL',
    zone_type: 'NO_FLY',
    geometry_type: 'CIRCLE',
    default_alt_min: 0,
    default_alt_max: 300,
    icon: 'Radio',
    generator: (lat, lon) => ({
      name: 'Stadium TFR (1 NM)',
      zone_type: 'NO_FLY',
      geometry_type: 'CIRCLE',
      center: [lat, lon],
      radius: 1852,
      altitude_min: 0,
      altitude_max: 300,
      priority: 4,
      enabled: true,
      visible: true,
    }),
  },
  {
    id: 'preset-safe-ops-box',
    title: 'Safe Operating Box (500m x 500m)',
    description: 'Authorized tactical flight containment box for autonomous swarm missions.',
    category: 'TACTICAL',
    zone_type: 'SAFE',
    geometry_type: 'POLYGON',
    default_alt_min: 5,
    default_alt_max: 120,
    icon: 'ShieldCheck',
    generator: (lat, lon) => {
      const dLat = 0.00225; // ~250m
      const dLon = 0.00285; // ~250m
      return {
        name: 'Tactical Swarm Safe Box (500m)',
        zone_type: 'SAFE',
        geometry_type: 'POLYGON',
        coordinates: [
          [lat + dLat, lon - dLon],
          [lat + dLat, lon + dLon],
          [lat - dLat, lon + dLon],
          [lat - dLat, lon - dLon],
        ],
        altitude_min: 5,
        altitude_max: 120,
        priority: 4,
        enabled: true,
        visible: true,
      };
    },
  },
  {
    id: 'preset-industrial-hex',
    title: 'Industrial Exclusion Perimeter',
    description: 'Hexagonal 400m radius buffer around critical infrastructure and refineries.',
    category: 'CIVIL',
    zone_type: 'NO_FLY',
    geometry_type: 'POLYGON',
    default_alt_min: 0,
    default_alt_max: 200,
    icon: 'Hexagon',
    generator: (lat, lon) => {
      const radiusDeg = 0.0036; // ~400m
      const coords: [number, number][] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * 60 * Math.PI) / 180;
        coords.push([lat + radiusDeg * Math.sin(angle), lon + radiusDeg * Math.cos(angle) * 1.25]);
      }
      return {
        name: 'Industrial Exclusion Hexagon',
        zone_type: 'NO_FLY',
        geometry_type: 'POLYGON',
        coordinates: coords,
        altitude_min: 0,
        altitude_max: 200,
        priority: 5,
        enabled: true,
        visible: true,
      };
    },
  },
  {
    id: 'preset-flight-corridor',
    title: 'Transit Corridor (1 km / 60m width)',
    description: 'Bi-directional low-altitude airspace corridor connecting takeoff & target.',
    category: 'CORRIDOR',
    zone_type: 'SAFE',
    geometry_type: 'CORRIDOR',
    default_alt_min: 15,
    default_alt_max: 60,
    icon: 'Route',
    generator: (lat, lon) => ({
      name: 'Alpha Flight Corridor (60m Wide)',
      zone_type: 'SAFE',
      geometry_type: 'CORRIDOR',
      coordinates: [
        [lat - 0.004, lon - 0.004],
        [lat, lon],
        [lat + 0.004, lon + 0.004],
      ],
      corridor_width: 60,
      altitude_min: 15,
      altitude_max: 60,
      priority: 3,
      enabled: true,
      visible: true,
    }),
  },
  {
    id: 'preset-warning-buffer',
    title: 'Perimeter Warning Buffer (800m)',
    description: 'Cautionary early-warning alert ring surrounding the primary safe box.',
    category: 'TACTICAL',
    zone_type: 'WARNING',
    geometry_type: 'CIRCLE',
    default_alt_min: 0,
    default_alt_max: 150,
    icon: 'AlertTriangle',
    generator: (lat, lon) => ({
      name: 'Early Warning Perimeter (800m)',
      zone_type: 'WARNING',
      geometry_type: 'CIRCLE',
      center: [lat, lon],
      radius: 800,
      altitude_min: 0,
      altitude_max: 150,
      priority: 2,
      enabled: true,
      visible: true,
    }),
  },
];
