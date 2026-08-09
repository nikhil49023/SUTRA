export interface DroneAsset {
  id: string;
  callsign: string;
  model: string;
  status: 'IN_FLIGHT' | 'STANDBY' | 'RTH' | 'ALERT';
  battery: number;
  altitude: number; // meters
  groundSpeed: number; // km/h
  heading: number; // degrees
  lat: number;
  lng: number;
  mission: string;
  payload: string;
  signalStrength: number; // %
  satellites: number;
  flightTime: string;
}

export interface TelemetryData {
  pitch: number;
  roll: number;
  yaw: number;
  altitudeAGL: number;
  altitudeMSL: number;
  groundSpeed: number;
  airSpeed: number;
  climbRate: number;
  batteryVoltage: number;
  batteryCurrent: number;
  batteryRemaining: number;
  cellVoltages: number[];
  motorRPM: number[];
  temperatureAvionics: number;
  temperatureESC: number;
  satellites: number;
  linkLatencyMs: number;
}

export interface OperationalAlert {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  coordinates?: string;
}

export interface Waypoint {
  id: number;
  lat: number;
  lng: number;
  alt: number;
  action: string;
  completed: boolean;
}

export interface AIDetection {
  id: string;
  type: string;
  confidence: number;
  coordinates: string;
  bbox: { x: number; y: number; w: number; h: number };
  timestamp: string;
}
