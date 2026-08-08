import type { Waypoint } from '../../types';
import type { MissionTemplate, TemplatePatternType } from '../types';

export class MissionTemplateManager {
  private static templates: MissionTemplate[] = [
    {
      id: 'template-grid-search',
      name: 'Grid Search Survey',
      description: 'Orthogonal grid pattern for aerial mapping, SAR, and thermal scanning.',
      patternType: 'GRID_SEARCH',
      defaultAltitudeM: 100,
      defaultSpeedKmh: 35,
      spacingMeters: 50,
      waypoints: generateGridPattern(45.1082, 34.5225, 5, 50, 100)
    },
    {
      id: 'template-perimeter-patrol',
      name: 'Perimeter Patrol',
      description: 'Outer boundary defense patrol loop around high-security installations.',
      patternType: 'PERIMETER_PATROL',
      defaultAltitudeM: 80,
      defaultSpeedKmh: 45,
      waypoints: generatePerimeterPattern(45.1082, 34.5225, 600, 80)
    },
    {
      id: 'template-orbit',
      name: 'Point of Interest Orbit',
      description: '360° continuous circular loiter surveillance around target coordinates.',
      patternType: 'ORBIT',
      defaultAltitudeM: 120,
      defaultSpeedKmh: 30,
      orbitRadiusMeters: 300,
      waypoints: generateOrbitPattern(45.1082, 34.5225, 300, 12, 120)
    },
    {
      id: 'template-rapid-recon',
      name: 'Rapid Reconnaissance',
      description: 'High-speed linear vector sprint across strategic checkpoints.',
      patternType: 'RAPID_RECON',
      defaultAltitudeM: 150,
      defaultSpeedKmh: 60,
      waypoints: generateReconPattern(45.1082, 34.5225, 150)
    },
    {
      id: 'template-zigzag',
      name: 'Zig-Zag Scan',
      description: 'Serpentine swath coverage for riverbank and linear border monitoring.',
      patternType: 'ZIG_ZAG',
      defaultAltitudeM: 90,
      defaultSpeedKmh: 40,
      waypoints: generateZigZagPattern(45.1082, 34.5225, 90)
    },
    {
      id: 'template-lawnmower',
      name: 'Lawn Mower Swath',
      description: 'Parallel back-and-forth flight lines for agricultural crop analytics.',
      patternType: 'LAWN_MOWER',
      defaultAltitudeM: 60,
      defaultSpeedKmh: 25,
      waypoints: generateLawnMowerPattern(45.1082, 34.5225, 60)
    },
    {
      id: 'template-corridor',
      name: 'Corridor Inspection',
      description: 'Linear buffer inspection route for pipelines, roads, and power grids.',
      patternType: 'CORRIDOR_INSPECTION',
      defaultAltitudeM: 110,
      defaultSpeedKmh: 50,
      waypoints: generateCorridorPattern(45.1082, 34.5225, 110)
    }
  ];

  public static getTemplates(): MissionTemplate[] {
    return [...this.templates];
  }

  public static getTemplateById(id: string): MissionTemplate | undefined {
    return this.templates.find((t) => t.id === id);
  }

  public static generateCustomPattern(
    patternType: TemplatePatternType,
    centerLat: number,
    centerLng: number,
    altitudeM: number = 100
  ): Waypoint[] {
    switch (patternType) {
      case 'GRID_SEARCH':
        return generateGridPattern(centerLat, centerLng, 5, 50, altitudeM);
      case 'PERIMETER_PATROL':
        return generatePerimeterPattern(centerLat, centerLng, 500, altitudeM);
      case 'ORBIT':
        return generateOrbitPattern(centerLat, centerLng, 300, 12, altitudeM);
      case 'RAPID_RECON':
        return generateReconPattern(centerLat, centerLng, altitudeM);
      case 'ZIG_ZAG':
        return generateZigZagPattern(centerLat, centerLng, altitudeM);
      case 'LAWN_MOWER':
        return generateLawnMowerPattern(centerLat, centerLng, altitudeM);
      case 'CORRIDOR_INSPECTION':
        return generateCorridorPattern(centerLat, centerLng, altitudeM);
      default:
        return generateReconPattern(centerLat, centerLng, altitudeM);
    }
  }
}

/* ============================================================
   Pattern Generation Helpers
   ============================================================ */

function generateGridPattern(lat: number, lng: number, rows: number, spacingM: number, alt: number): Waypoint[] {
  const waypoints: Waypoint[] = [];
  const deltaLat = (spacingM / 111320);
  const deltaLng = (spacingM / (111320 * Math.cos(lat * Math.PI / 180)));

  let id = 1;
  for (let r = 0; r < rows; r++) {
    const rLat = lat + (r - Math.floor(rows / 2)) * deltaLat;
    if (r % 2 === 0) {
      waypoints.push({ id: id++, lat: rLat, lng: lng - deltaLng * 2, alt, action: 'WAYPOINT', completed: false });
      waypoints.push({ id: id++, lat: rLat, lng: lng + deltaLng * 2, alt, action: 'WAYPOINT', completed: false });
    } else {
      waypoints.push({ id: id++, lat: rLat, lng: lng + deltaLng * 2, alt, action: 'WAYPOINT', completed: false });
      waypoints.push({ id: id++, lat: rLat, lng: lng - deltaLng * 2, alt, action: 'WAYPOINT', completed: false });
    }
  }
  return waypoints;
}

function generatePerimeterPattern(lat: number, lng: number, radiusM: number, alt: number): Waypoint[] {
  const waypoints: Waypoint[] = [];
  const points = 6;
  const deltaLat = (radiusM / 111320);
  const deltaLng = (radiusM / (111320 * Math.cos(lat * Math.PI / 180)));

  for (let i = 0; i <= points; i++) {
    const angle = (i % points) * (2 * Math.PI / points);
    waypoints.push({
      id: i + 1,
      lat: lat + Math.sin(angle) * deltaLat,
      lng: lng + Math.cos(angle) * deltaLng,
      alt,
      action: 'WAYPOINT',
      completed: false
    });
  }
  return waypoints;
}

function generateOrbitPattern(lat: number, lng: number, radiusM: number, numPoints: number, alt: number): Waypoint[] {
  const waypoints: Waypoint[] = [];
  const deltaLat = (radiusM / 111320);
  const deltaLng = (radiusM / (111320 * Math.cos(lat * Math.PI / 180)));

  for (let i = 0; i < numPoints; i++) {
    const angle = i * (2 * Math.PI / numPoints);
    waypoints.push({
      id: i + 1,
      lat: lat + Math.sin(angle) * deltaLat,
      lng: lng + Math.cos(angle) * deltaLng,
      alt,
      action: 'LOITER',
      completed: false
    });
  }
  return waypoints;
}

function generateReconPattern(lat: number, lng: number, alt: number): Waypoint[] {
  return [
    { id: 1, lat: lat - 0.005, lng: lng - 0.005, alt, action: 'WAYPOINT', completed: false },
    { id: 2, lat: lat, lng: lng + 0.003, alt: alt + 20, action: 'WAYPOINT', completed: false },
    { id: 3, lat: lat + 0.006, lng: lng + 0.008, alt: alt + 40, action: 'WAYPOINT', completed: false },
    { id: 4, lat: lat + 0.002, lng: lng - 0.004, alt, action: 'WAYPOINT', completed: false }
  ];
}

function generateZigZagPattern(lat: number, lng: number, alt: number): Waypoint[] {
  return [
    { id: 1, lat: lat - 0.004, lng: lng - 0.006, alt, action: 'WAYPOINT', completed: false },
    { id: 2, lat: lat - 0.002, lng: lng + 0.002, alt, action: 'WAYPOINT', completed: false },
    { id: 3, lat: lat, lng: lng - 0.006, alt, action: 'WAYPOINT', completed: false },
    { id: 4, lat: lat + 0.002, lng: lng + 0.002, alt, action: 'WAYPOINT', completed: false },
    { id: 5, lat: lat + 0.004, lng: lng - 0.006, alt, action: 'WAYPOINT', completed: false }
  ];
}

function generateLawnMowerPattern(lat: number, lng: number, alt: number): Waypoint[] {
  return [
    { id: 1, lat: lat - 0.003, lng: lng - 0.004, alt, action: 'WAYPOINT', completed: false },
    { id: 2, lat: lat + 0.003, lng: lng - 0.004, alt, action: 'WAYPOINT', completed: false },
    { id: 3, lat: lat + 0.003, lng: lng - 0.002, alt, action: 'WAYPOINT', completed: false },
    { id: 4, lat: lat - 0.003, lng: lng - 0.002, alt, action: 'WAYPOINT', completed: false },
    { id: 5, lat: lat - 0.003, lng: lng, alt, action: 'WAYPOINT', completed: false },
    { id: 6, lat: lat + 0.003, lng: lng, alt, action: 'WAYPOINT', completed: false }
  ];
}

function generateCorridorPattern(lat: number, lng: number, alt: number): Waypoint[] {
  return [
    { id: 1, lat: lat - 0.008, lng: lng - 0.008, alt, action: 'WAYPOINT', completed: false },
    { id: 2, lat: lat - 0.002, lng: lng - 0.002, alt, action: 'WAYPOINT', completed: false },
    { id: 3, lat: lat + 0.004, lng: lng + 0.004, alt, action: 'WAYPOINT', completed: false },
    { id: 4, lat: lat + 0.009, lng: lng + 0.009, alt, action: 'WAYPOINT', completed: false }
  ];
}
