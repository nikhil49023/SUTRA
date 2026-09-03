import { create } from 'zustand';
import { MissionState, Waypoint } from '../types/mission';

interface MissionStoreState extends MissionState {
  isAddingWaypoint: boolean;
  fitRouteTrigger: number;
  hoveredWaypointIndex: number | null;
  is_valid: boolean;
  validation_errors: string[];

  setIsAddingWaypoint: (isAdding: boolean) => void;
  triggerFitRoute: () => void;
  setHoveredWaypointIndex: (index: number | null) => void;
  setWaypoints: (waypoints: Waypoint[]) => void;
  hydrateFromSnapshot: (missionState: Partial<MissionState>) => void;
  updateFromEvent: (topicOrPartial: string | Partial<MissionState>, payload?: any) => void;
}

export const useMissionStore = create<MissionStoreState>((set) => ({
  mission_id: 'mission-alpha-01',
  mission_name: 'ALPHA RECON',
  state: 'READY',
  waypoints: [
    { id: 'wp-1', index: 1, latitude: 37.7752, longitude: -122.4190, altitude: 25, speed: 6, command: 'WAYPOINT', hold_time: 0, acceptance_radius: 2 },
    { id: 'wp-2', index: 2, latitude: 37.7765, longitude: -122.4175, altitude: 30, speed: 8, command: 'WAYPOINT', hold_time: 2, acceptance_radius: 2 },
    { id: 'wp-3', index: 3, latitude: 37.7780, longitude: -122.4195, altitude: 35, speed: 7, command: 'WAYPOINT', hold_time: 0, acceptance_radius: 2 },
    { id: 'wp-4', index: 4, latitude: 37.7760, longitude: -122.4215, altitude: 25, speed: 5, command: 'WAYPOINT', hold_time: 5, acceptance_radius: 2 },
  ],
  home_latitude: 37.774929,
  home_longitude: -122.419416,
  selected_waypoint_id: null,
  active_waypoint_index: 1,
  mission_progress: 0,
  distance_remaining: 1250,
  estimated_time_remaining: 180,
  estimated_battery_required: 14.5,
  risk_level: 'LOW',
  validation_status: 'READY',
  is_valid: true,
  validation_errors: [],
  isAddingWaypoint: false,
  fitRouteTrigger: 0,
  hoveredWaypointIndex: null,

  setIsAddingWaypoint: (isAddingWaypoint) => set({ isAddingWaypoint }),
  triggerFitRoute: () => set((s) => ({ fitRouteTrigger: s.fitRouteTrigger + 1 })),
  setHoveredWaypointIndex: (hoveredWaypointIndex) => set({ hoveredWaypointIndex }),
  setWaypoints: (waypoints) => set({ waypoints }),
  hydrateFromSnapshot: (missionState) => set((s) => ({ ...s, ...missionState })),
  updateFromEvent: (topicOrPartial, payload) =>
    set((s) => {
      if (typeof topicOrPartial === 'object') {
        return { ...s, ...topicOrPartial };
      }
      if (topicOrPartial === 'mission.started') return { ...s, state: 'MISSION' };
      if (topicOrPartial === 'mission.paused') return { ...s, state: 'HOLD' };
      if (topicOrPartial === 'mission.resumed') return { ...s, state: 'MISSION' };
      if (topicOrPartial === 'mission.rtl') return { ...s, state: 'RTL' };
      if (topicOrPartial === 'mission.waypoint_reached' && payload) {
        return { ...s, active_waypoint_index: payload.waypoint_index };
      }
      return s;
    }),
}));
