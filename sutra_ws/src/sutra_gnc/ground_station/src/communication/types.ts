export type AutopilotType = 'PX4' | 'ARDUPILOT' | 'GENERIC_MAVLINK';
export type VehicleType = 'HEXAROTOR' | 'QUADROTOR' | 'VTOL' | 'FIXED_WING';

export interface MAVLinkHeartbeat {
  sysId: number;
  compId: number;
  autopilot: AutopilotType;
  vehicleType: VehicleType;
  baseMode: number;
  customMode: number;
  systemStatus: 'UNINIT' | 'BOOT' | 'CALIBRATING' | 'STANDBY' | 'ACTIVE' | 'CRITICAL' | 'EMERGENCY';
  mavlinkVersion: number;
}

export interface MAVLinkCommand {
  id: string;
  commandId: number; // MAV_CMD enum (e.g. 16 = NAV_WAYPOINT, 20 = RTL, 400 = ARM_DISARM)
  priority: 'EMERGENCY' | 'HIGH' | 'NORMAL';
  targetSysId: number;
  targetCompId: number;
  params: [number, number, number, number, number, number, number];
  timestamp: string;
}

export interface MAVLinkCommandAck {
  commandId: number;
  result: 'ACCEPTED' | 'TEMPORARILY_REJECTED' | 'DENIED' | 'UNSUPPORTED' | 'FAILED';
  progress?: number;
}

export interface MAVParam {
  paramId: string;
  paramValue: number;
  paramType: 'INT32' | 'FLOAT' | 'UINT8';
  paramIndex: number;
  paramCount: number;
}

export interface IDroneAdapter {
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  sendHeartbeat(): void;
  sendCommand(cmd: MAVLinkCommand): Promise<MAVLinkCommandAck>;
  uploadMission(waypoints: any[]): Promise<boolean>;
  downloadMission(): Promise<any[]>;
  fetchParameters(): Promise<MAVParam[]>;
  setParameter(paramId: string, value: number): Promise<boolean>;
}
