import { AlertSeverity } from './alerts';

export type NavigationSection =
  | 'COMMAND'
  | 'MISSION'
  | 'GEOFENCE'
  | 'GIS'
  | 'FLEET'
  | 'AI'
  | 'DISASTER_INTEL'
  | 'RISK'
  | 'LIVEOPS'
  | 'SETTINGS';

export type MapStyleType = 'tactical-dark' | 'satellite' | 'terrain' | 'streets' | 'swarm-live-ortho';

export interface Alert {
  alert_id: string;
  timestamp: number;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
  title?: string;
  message: string;
  source: string;
  drone_id?: string | null;
  acknowledged: boolean;
}

export interface AlertState {
  alerts: Alert[];
}

export interface ApplicationState {
  application_status: string;
  backend_connected: boolean;
  websocket_connected: boolean;
  mavlink_connected: boolean;
  simulation_mode: boolean;
  current_user: string;
  app_version: string;
}

export type SelectedObjectType = 'DRONE' | 'WAYPOINT' | 'GEOFENCE' | 'TARGET' | 'NONE';

export interface SelectionState {
  selected_type: SelectedObjectType;
  selected_id: string | null;
  hovered_id: string | null;
}
