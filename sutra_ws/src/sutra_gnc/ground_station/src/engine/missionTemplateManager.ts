import type { MissionTemplate } from './types';

export class MissionTemplateManager {
  private static templates: MissionTemplate[] = [
    {
      id: 'TPL-GRID',
      name: 'Grid Search Pattern',
      description: 'Systematic lawnmower coverage pattern for SAR and thermal mapping.',
      patternType: 'GRID',
      defaultAltitudeM: 450,
      defaultSpeedKmh: 54,
      waypoints: [
        { lat: 34.5011, lng: 45.0920, alt: 200, action: 'TAKEOFF' },
        { lat: 34.5180, lng: 45.1020, alt: 450, action: 'WAYPOINT' },
        { lat: 34.5225, lng: 45.1082, alt: 450, action: 'TARGET SCAN' },
        { lat: 34.5300, lng: 45.1150, alt: 450, action: 'SEARCH PATTERN' },
        { lat: 34.5011, lng: 45.0920, alt: 0, action: 'RTH & LAND' }
      ]
    },
    {
      id: 'TPL-PERIMETER',
      name: 'Perimeter Border Patrol',
      description: 'Outer boundary surveillance with automated AI threat scanning.',
      patternType: 'PERIMETER',
      defaultAltitudeM: 600,
      defaultSpeedKmh: 65,
      waypoints: [
        { lat: 34.5011, lng: 45.0920, alt: 200, action: 'TAKEOFF' },
        { lat: 34.5410, lng: 45.1250, alt: 600, action: 'PATROL' },
        { lat: 34.5380, lng: 45.1400, alt: 600, action: 'PATROL' },
        { lat: 34.5011, lng: 45.0920, alt: 0, action: 'RTH & LAND' }
      ]
    },
    {
      id: 'TPL-LOITER',
      name: 'Point-Interest Loiter',
      description: 'Stationary 360-degree circular orbit for continuous target observation.',
      patternType: 'LOITER',
      defaultAltitudeM: 350,
      defaultSpeedKmh: 40,
      waypoints: [
        { lat: 34.5011, lng: 45.0920, alt: 200, action: 'TAKEOFF' },
        { lat: 34.5225, lng: 45.1082, alt: 350, action: 'LOITER' },
        { lat: 34.5011, lng: 45.0920, alt: 0, action: 'RTH & LAND' }
      ]
    }
  ];

  static getTemplates(): MissionTemplate[] {
    return this.templates;
  }

  static getTemplateById(id: string): MissionTemplate | undefined {
    return this.templates.find((t) => t.id === id);
  }
}
