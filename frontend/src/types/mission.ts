export type MissionStateEnum =
  | 'IDLE'
  | 'PLANNING'
  | 'VALIDATING'
  | 'READY'
  | 'UPLOADING'
  | 'ARMING'
  | 'TAKEOFF'
  | 'MISSION'
  | 'HOLD'
  | 'RTL'
  | 'LANDING'
  | 'COMPLETE'
  | 'COMPLETED'
  | 'ABORTED'
  | 'EMERGENCY'
  | 'IN_PROGRESS'
  | 'PAUSED';

export type WaypointCommand =
  | 'WAYPOINT'
  | 'TAKEOFF'
  | 'LAND'
  | 'RTL'
  | 'LOITER_TIME'
  | 'LOITER_TURNS'
  | 'LOITER_UNLIM'
  | 'SPLINE_WAYPOINT'
  | 'PAYLOAD_DROP'
  | 'SURVEY_GRID';

export type WaypointAction = 'NAVIGATE' | 'LOITER' | 'PAYLOAD_DROP' | 'TAKEOFF' | 'LAND' | 'RTL' | string;

export interface Waypoint {
  id?: string;
  index: number;
  latitude: number;
  longitude: number;
  altitude: number; // AGL in meters (or altitude_agl)
  speed: number;    // m/s (or speed_mps)
  command?: WaypointCommand;
  action?: WaypointAction;
  hold_time?: number;
  acceptance_radius?: number;
  param1?: number;
  param2?: number;
  param3?: number;
  param4?: number;
}

export interface MissionState {
  mission_id: string;
  mission_name: string;
  state: MissionStateEnum;
  waypoints: Waypoint[];
  home_latitude: number;
  home_longitude: number;
  selected_waypoint_id: string | null;
  active_waypoint_index: number;
  mission_progress: number; // 0 - 100%
  distance_remaining: number; // meters
  estimated_time_remaining: number; // seconds
  estimated_battery_required: number; // percentage
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  validation_status: 'UNVALIDATED' | 'READY' | 'INVALID' | 'VALIDATING' | string;
  mission_started_at?: number | null;
  mission_completed_at?: number | null;
}

export interface ValidationReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
