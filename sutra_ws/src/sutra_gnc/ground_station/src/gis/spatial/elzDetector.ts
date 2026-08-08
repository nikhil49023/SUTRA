import type { EmergencyLandingZone } from '../types';
import { SpatialAnalyticsEngine } from './spatialAnalytics';
import { DEMEngine } from '../terrain/demEngine';

export class ELZDetectorEngine {
  private static knownZones: EmergencyLandingZone[] = [
    {
      id: 'elz-alpha',
      name: 'Alpha Helipad Sector 4',
      lat: 45.1112,
      lng: 34.5205,
      elevationM: 352,
      distanceFromDroneKm: 0,
      surfaceType: 'TARMAC',
      suitabilityScore: 98,
      isClear: true
    },
    {
      id: 'elz-[#0b1428]',
      name: 'Bravo Open Field',
      lat: 45.1025,
      lng: 34.5285,
      elevationM: 345,
      distanceFromDroneKm: 0,
      surfaceType: 'OPEN_FIELD',
      suitabilityScore: 88,
      isClear: true
    },
    {
      id: 'elz-charlie',
      name: 'Charlie Training Grounds',
      lat: 45.1150,
      lng: 34.5120,
      elevationM: 360,
      distanceFromDroneKm: 0,
      surfaceType: 'GRASS',
      suitabilityScore: 92,
      isClear: true
    }
  ];

  /**
   * Find nearest Emergency Landing Zone (ELZ) relative to drone position.
   */
  public static findNearestELZ(droneLat: number, droneLng: number): EmergencyLandingZone | undefined {
    let nearest: EmergencyLandingZone | undefined = undefined;
    let minDistance = Infinity;

    this.knownZones.forEach((zone) => {
      const dist = SpatialAnalyticsEngine.calculateDistanceKm(
        { lat: droneLat, lng: droneLng },
        { lat: zone.lat, lng: zone.lng }
      );

      if (dist < minDistance) {
        minDistance = dist;
        nearest = {
          ...zone,
          distanceFromDroneKm: Math.round(dist * 100) / 100,
          elevationM: DEMEngine.getElevation(zone.lat, zone.lng)
        };
      }
    });

    return nearest;
  }

  public static getAllELZs(droneLat: number, droneLng: number): EmergencyLandingZone[] {
    return this.knownZones.map((z) => ({
      ...z,
      distanceFromDroneKm: SpatialAnalyticsEngine.calculateDistanceKm(
        { lat: droneLat, lng: droneLng },
        { lat: z.lat, lng: z.lng }
      )
    }));
  }
}
