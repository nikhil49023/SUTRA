export type DroneRole = 'LEADER' | 'WINGMAN' | 'SCOUT' | 'SUPPORT' | 'RELAY';

export type FormationType =
  | 'LINE'
  | 'COLUMN'
  | 'V_FORMATION'
  | 'DIAMOND'
  | 'ECHELON_LEFT'
  | 'ECHELON_RIGHT'
  | 'CIRCLE'
  | 'GRID'
  | 'CUSTOM';

export interface DroneState {
  drone_id: string;
  callsign: string;
  role: DroneRole | string;
  latitude: number;
  longitude: number;
  altitude: number;
  heading: number;
  pitch: number;
  roll: number;
  speed: number;
  battery: number;
  connection_status: 'CONNECTED' | 'DISCONNECTED' | 'DEGRADED';
  flight_mode: string;
  mission_id?: string | null;
  is_leader: boolean;
  formation_index: number;
  target_latitude?: number | null;
  target_longitude?: number | null;
  target_altitude?: number | null;
  target_heading?: number | null;
  offset_x?: number;
  offset_y?: number;
  formation?: FormationType | string;
}

export interface FleetState {
  drones: Record<string, DroneState>;
  leader_id: string | null;
  formation: FormationType | string;
  spacing: number; // meters
  formation_heading?: number | null;
  follow_leader_heading: boolean;
  show_guides: boolean;
}
