import type { DroneAsset, TelemetryData, Waypoint } from '../types';

/* ============================================================
   Legacy Hardware Interfaces
   ============================================================ */

export interface MAVLinkCommand { 
  id?: string; 
  commandId?: string; 
  command: number; 
  param1?: number; 
  param2?: number; 
  priority?: 'EMERGENCY' | 'HIGH' | 'NORMAL'; 
}

export interface MAVLinkCommandAck { 
  commandId?: string; 
  command: number; 
  result: any; 
}

export interface MAVParam { name: string; value: number; type?: string; }

export interface MAVLinkMissionItem { 
  seq: number; 
  frame?: number; 
  command?: number; 
  current?: number; 
  autocontinue?: number; 
  param1?: number; 
  param2?: number; 
  param3?: number; 
  param4?: number; 
  x?: number; 
  y?: number; 
  z?: number; 
  lat: number; 
  lng: number; 
  alt: number; 
}

export interface IDroneAdapter { connect(url: string): Promise<boolean>; }

/* ============================================================
   Connection & Vehicle Discovery Types
   ============================================================ */

export type ConnectionType = 'UDP_SITL' | 'SERIAL_MAVLINK' | 'MAVSDK_GRPC' | 'SIMULATION_INTERNAL';

export type AutopilotType = 'PX4' | 'ARDUPILOT' | 'GENERIC_MAVLINK' | 'SIMULATOR';

export interface VehicleDiscoveryInfo {
  systemId: number;
  componentId: number;
  vehicleType: 'QUADROUTER' | 'HEXAROTOR' | 'FIXED_WING' | 'VTOL' | 'ROVER';
  autopilot: AutopilotType;
  firmwareVersion: string;
  connectionType: ConnectionType;
  connectionUrl: string; // e.g. "udp://127.0.0.1:14540" or "/dev/ttyUSB0:57600"
  isConnected: boolean;
  lastHeartbeatTime: string;
}

/* ============================================================
   MAVLink Message Types
   ============================================================ */

export type MAVLinkMsgType =
  | 'HEARTBEAT'
  | 'GLOBAL_POSITION_INT'
  | 'ATTITUDE'
  | 'SYS_STATUS'
  | 'MISSION_COUNT'
  | 'MISSION_ITEM_INT'
  | 'MISSION_ACK'
  | 'PARAM_VALUE'
  | 'STATUSTEXT'
  | 'COMMAND_LONG'
  | 'MISSION_CURRENT'
  | 'MISSION_ITEM_REACHED'
  | 'MISSION_REQUEST_INT';

export interface MAVLinkPacket {
  sysId: number;
  compId: number;
  msgId: number;
  msgName: MAVLinkMsgType;
  payload: Record<string, any>;
  sequence: number;
  timestamp: string;
}

/* ============================================================
   Parameter Management Types
   ============================================================ */

export interface MAVParameter {
  name: string;
  value: number;
  type: 'INT32' | 'FLOAT' | 'UINT16';
  defaultValue?: number;
  description?: string;
  category?: string;
  isModified?: boolean;
}

/* ============================================================
   Camera & Video Stream Types
   ============================================================ */

export type CameraType = 'RTSP_STREAM' | 'USB_WEBCAM' | 'THERMAL_INFRARED';

export interface CameraStreamConfig {
  id: string;
  name: string;
  type: CameraType;
  url: string;
  resolution: string;
  fps: number;
  isRecording: boolean;
  isActive: boolean;
}

/* ============================================================
   Failsafe Watchdog Types
   ============================================================ */

export type WatchdogTrigger =
  | 'HEARTBEAT_TIMEOUT'
  | 'GPS_LOSS'
  | 'TELEMETRY_LOSS'
  | 'CAMERA_LOSS'
  | 'LOW_BATTERY'
  | 'HIGH_LATENCY';

export interface WatchdogAlert {
  id: string;
  trigger: WatchdogTrigger;
  systemId: number;
  severity: 'WARNING' | 'CRITICAL';
  message: string;
  timestamp: string;
}
