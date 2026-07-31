import { DroneAsset, TelemetryData, OperationalAlert, Waypoint, AIDetection } from '../types';

export const INITIAL_DRONES: DroneAsset[] = [
  {
    id: 'UAV-01',
    callsign: 'PHANTOM-ALPHA',
    model: 'Apex Reaper Mk-IV',
    status: 'IN_FLIGHT',
    battery: 84,
    altitude: 450,
    groundSpeed: 54,
    heading: 142,
    lat: 34.5225,
    lng: 45.1082,
    mission: 'Op Desert Falcon - Recon',
    payload: 'EO/IR Dual Thermal + LRF',
    signalStrength: 98,
    satellites: 21,
    flightTime: '00:42:18'
  },
  {
    id: 'UAV-02',
    callsign: 'SPECTRE-BETA',
    model: 'Titan Hawk VTOL',
    status: 'IN_FLIGHT',
    battery: 62,
    altitude: 620,
    groundSpeed: 78,
    heading: 215,
    lat: 34.5410,
    lng: 45.1250,
    mission: 'Sector 4-B Perimeter Patrol',
    payload: 'Multispectral Mapper',
    signalStrength: 91,
    satellites: 18,
    flightTime: '01:15:02'
  },
  {
    id: 'UAV-03',
    callsign: 'VORTEX-GAMMA',
    model: 'CyberScout X-1',
    status: 'STANDBY',
    battery: 100,
    altitude: 0,
    groundSpeed: 0,
    heading: 0,
    lat: 34.5011,
    lng: 45.0920,
    mission: 'Rapid Response Standby',
    payload: 'SigInt Receiver Array',
    signalStrength: 100,
    satellites: 24,
    flightTime: '00:00:00'
  },
  {
    id: 'UAV-04',
    callsign: 'SHADOW-DELTA',
    model: 'Apex Reaper Mk-IV',
    status: 'RTH',
    battery: 22,
    altitude: 180,
    groundSpeed: 62,
    heading: 350,
    lat: 34.5120,
    lng: 45.0980,
    mission: 'Returning to Home Base',
    payload: 'Cargo Pod A',
    signalStrength: 88,
    satellites: 19,
    flightTime: '02:08:40'
  }
];

export const INITIAL_TELEMETRY: TelemetryData = {
  pitch: 4.2,
  roll: -1.8,
  yaw: 142.5,
  altitudeAGL: 450,
  altitudeMSL: 1280,
  groundSpeed: 54.2,
  airSpeed: 58.0,
  climbRate: 1.2,
  batteryVoltage: 24.4,
  batteryCurrent: 18.5,
  batteryRemaining: 84,
  cellVoltages: [4.07, 4.06, 4.07, 4.06, 4.07, 4.07],
  motorRPM: [4250, 4240, 4260, 4245],
  temperatureAvionics: 38.4,
  temperatureESC: 44.2,
  satellites: 21,
  linkLatencyMs: 14
};

export const MOCK_ALERTS: OperationalAlert[] = [
  {
    id: 'ALT-1092',
    severity: 'WARNING',
    title: 'High Wind Shear Detected',
    message: 'Gusts up to 24 kts at Sector 4-B, 500m AGL.',
    timestamp: '11:41:02',
    acknowledged: false,
    coordinates: '34.528, 45.112'
  },
  {
    id: 'ALT-1091',
    severity: 'INFO',
    title: 'Waypoint 14 Reached',
    message: 'Target area search pattern initiated.',
    timestamp: '11:38:45',
    acknowledged: true,
    coordinates: '34.5225, 45.1082'
  },
  {
    id: 'ALT-1090',
    severity: 'CRITICAL',
    title: 'RF Interference Spike',
    message: 'Frequency hop triggered on 5.8GHz link.',
    timestamp: '11:29:10',
    acknowledged: true,
    coordinates: '34.531, 45.102'
  }
];

export const MOCK_WAYPOINTS: Waypoint[] = [
  { id: 1, lat: 34.5011, lng: 45.0920, alt: 200, action: 'TAKEOFF', completed: true },
  { id: 2, lat: 34.5100, lng: 45.0980, alt: 350, action: 'TRANSITION', completed: true },
  { id: 3, lat: 34.5180, lng: 45.1020, alt: 450, action: 'PATROL', completed: true },
  { id: 4, lat: 34.5225, lng: 45.1082, alt: 450, action: 'TARGET SCAN', completed: true },
  { id: 5, lat: 34.5300, lng: 45.1150, alt: 450, action: 'SEARCH PATTERN', completed: false },
  { id: 6, lat: 34.5380, lng: 45.1200, alt: 500, action: 'LOITER', completed: false },
  { id: 7, lat: 34.5011, lng: 45.0920, alt: 0, action: 'RTH & LAND', completed: false },
];

export const MOCK_AI_DETECTIONS: AIDetection[] = [
  {
    id: 'DET-001',
    type: 'Convoy Vehicle (Armored)',
    confidence: 96.4,
    coordinates: '34.5231 N, 45.1095 E',
    bbox: { x: 35, y: 40, w: 25, h: 30 },
    timestamp: '11:42:10'
  },
  {
    id: 'DET-002',
    type: 'Heat Signature (Personnel)',
    confidence: 88.7,
    coordinates: '34.5240 N, 45.1110 E',
    bbox: { x: 68, y: 25, w: 12, h: 18 },
    timestamp: '11:41:55'
  }
];
