export type HardwareOperationalMode = 'SIMULATION' | 'HARDWARE';

export type CameraStreamType = 'RTSP_IP' | 'USB_V4L2' | 'THERMAL_IR' | 'MOCK_FEED';

export interface CameraConfig {
  id: string;
  type: CameraStreamType;
  endpoint: string; // e.g. "rtsp://192.168.1.100:554/live" or "/dev/video0"
  resolution: string;
  fps: number;
  isActive: boolean;
}

export interface RadioLinkStats {
  devicePort: string; // e.g. "/dev/ttyUSB0"
  baudRate: number;
  rssiDbm: number;
  noiseDbm: number;
  txErrors: number;
  rxErrors: number;
  linkQualityPercent: number;
}

export interface GimbalTelemetry {
  pitchDeg: number;
  rollDeg: number;
  yawDeg: number;
  mode: 'FREE' | 'TARGET_LOCK' | 'GCS_POINT';
}

export interface IMUSensorData {
  accelXG: number;
  accelYG: number;
  accelZG: number;
  gyroXDegS: number;
  gyroYDegS: number;
  gyroZDegS: number;
  baroAltM: number;
  temperatureC: number;
}

export interface RCLinkData {
  rssiPercent: number;
  channelValues: number[]; // 16 PWM channel values (1000-2000 us)
  isFailsafeActive: boolean;
}
