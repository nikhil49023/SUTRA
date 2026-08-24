export interface TelemetryState {
  drone_id: string;
  timestamp: number;
  latitude: number;
  longitude: number;
  altitude_msl: number;
  altitude_agl: number;
  ground_speed: number;
  air_speed: number;
  heading: number;
  pitch: number;
  roll: number;
  yaw: number;
  vertical_speed: number;
  battery_percent: number;
  battery_voltage: number;
  battery_current: number;
  temperature: number;
  satellites: number;
  hdop: number;
  gps_fix: number;
  rssi: number;
  latency_ms: number;
  flight_mode: string;
}
