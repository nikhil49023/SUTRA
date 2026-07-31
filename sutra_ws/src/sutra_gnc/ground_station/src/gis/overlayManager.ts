export interface EmergencyLandingZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'HELIPAD' | 'OPEN_FIELD' | 'RUNWAY';
  surface: 'ASPHALT' | 'GRASS' | 'CONCRETE';
  isAvailable: boolean;
}

export interface WindVector {
  lat: number;
  lng: number;
  speedKts: number;
  directionDeg: number;
}

export class OverlayManager {
  static getEmergencyLandingZones(): EmergencyLandingZone[] {
    return [
      { id: 'ELZ-01', name: 'Alpha Sector Airfield Helipad', lat: 34.5050, lng: 45.0980, type: 'HELIPAD', surface: 'ASPHALT', isAvailable: true },
      { id: 'ELZ-02', name: 'Sector 4 Emergency Flat Field', lat: 34.5290, lng: 45.1200, type: 'OPEN_FIELD', surface: 'GRASS', isAvailable: true },
      { id: 'ELZ-03', name: 'Tactical Forward Runway', lat: 34.4980, lng: 45.0850, type: 'RUNWAY', surface: 'CONCRETE', isAvailable: true }
    ];
  }

  static getWindVectorField(): WindVector[] {
    return [
      { lat: 34.5100, lng: 45.1000, speedKts: 12, directionDeg: 315 },
      { lat: 34.5200, lng: 45.1100, speedKts: 14, directionDeg: 310 },
      { lat: 34.5300, lng: 45.1200, speedKts: 16, directionDeg: 320 }
    ];
  }
}
