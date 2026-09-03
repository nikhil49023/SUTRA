/**
 * Smart Horizon GCS — Authoritative Mission State & Waypoint Progression Store
 */

import { create } from 'zustand';
import { MissionState, Waypoint } from '../types/mission';
import { commandManager } from '../communication/CommandManager';

export interface MissionPreset {
  id: string;
  name: string;
  description: string;
  icon?: string;
  generateWaypoints: (centerLat: number, centerLon: number) => Waypoint[];
}

export const MISSION_PRESETS: MissionPreset[] = [
  {
    id: 'sar-lawnmower',
    name: 'SAR Lawnmower Grid',
    description: 'Boustrophedon cross-sweep search corridor (50m line spacing, 30m AGL).',
    generateWaypoints: (lat, lon) => [
      { id: 'wp-1', index: 1, latitude: lat - 0.0020, longitude: lon - 0.0025, altitude: 30, speed: 6, command: 'WAYPOINT', hold_time: 0, acceptance_radius: 2 },
      { id: 'wp-2', index: 2, latitude: lat + 0.0020, longitude: lon - 0.0025, altitude: 30, speed: 7, command: 'WAYPOINT', hold_time: 0, acceptance_radius: 2 },
      { id: 'wp-3', index: 3, latitude: lat + 0.0020, longitude: lon - 0.0010, altitude: 30, speed: 7, command: 'WAYPOINT', hold_time: 0, acceptance_radius: 2 },
      { id: 'wp-4', index: 4, latitude: lat - 0.0020, longitude: lon - 0.0010, altitude: 30, speed: 7, command: 'WAYPOINT', hold_time: 0, acceptance_radius: 2 },
      { id: 'wp-5', index: 5, latitude: lat - 0.0020, longitude: lon + 0.0005, altitude: 30, speed: 7, command: 'WAYPOINT', hold_time: 0, acceptance_radius: 2 },
      { id: 'wp-6', index: 6, latitude: lat + 0.0020, longitude: lon + 0.0005, altitude: 30, speed: 7, command: 'WAYPOINT', hold_time: 0, acceptance_radius: 2 },
    ],
  },
  {
    id: 'perimeter-recon',
    name: 'Perimeter Boundary Recon',
    description: 'Tactical polygon perimeter containment sweep (25m AGL, 8m/s).',
    generateWaypoints: (lat, lon) => [
      { id: 'wp-1', index: 1, latitude: lat + 0.0025, longitude: lon - 0.0025, altitude: 25, speed: 8, command: 'WAYPOINT', hold_time: 2, acceptance_radius: 2 },
      { id: 'wp-2', index: 2, latitude: lat + 0.0025, longitude: lon + 0.0025, altitude: 25, speed: 8, command: 'WAYPOINT', hold_time: 2, acceptance_radius: 2 },
      { id: 'wp-3', index: 3, latitude: lat - 0.0025, longitude: lon + 0.0025, altitude: 25, speed: 8, command: 'WAYPOINT', hold_time: 2, acceptance_radius: 2 },
      { id: 'wp-4', index: 4, latitude: lat - 0.0025, longitude: lon - 0.0025, altitude: 25, speed: 8, command: 'WAYPOINT', hold_time: 2, acceptance_radius: 2 },
    ],
  },
  {
    id: 'urban-corridor',
    name: 'Urban Transit Corridor',
    description: 'Low-altitude obstacle-cleared transit line with designated checkpoints.',
    generateWaypoints: (lat, lon) => [
      { id: 'wp-1', index: 1, latitude: lat - 0.0015, longitude: lon - 0.0020, altitude: 20, speed: 5, command: 'WAYPOINT', hold_time: 0, acceptance_radius: 2 },
      { id: 'wp-2', index: 2, latitude: lat - 0.0005, longitude: lon - 0.0005, altitude: 28, speed: 6, command: 'WAYPOINT', hold_time: 3, acceptance_radius: 2 },
      { id: 'wp-3', index: 3, latitude: lat + 0.0010, longitude: lon + 0.0010, altitude: 35, speed: 7, command: 'WAYPOINT', hold_time: 0, acceptance_radius: 2 },
      { id: 'wp-4', index: 4, latitude: lat + 0.0020, longitude: lon + 0.0020, altitude: 25, speed: 6, command: 'WAYPOINT', hold_time: 5, acceptance_radius: 2 },
    ],
  },
];

interface MissionStoreState extends MissionState {
  isAddingWaypoint: boolean;
  fitRouteTrigger: number;
  hoveredWaypointIndex: number | null;
  is_valid: boolean;
  validation_errors: string[];

  // Action Dispatchers
  startMission: () => void;
  pauseMission: () => void;
  resumeMission: () => void;
  abortMission: () => void;
  restartMission: () => void;
  clearMission: () => void;
  loadPreset: (presetId: string, centerLat?: number, centerLon?: number) => void;

  addWaypoint: (wp: { latitude: number; longitude: number; altitude?: number; speed?: number }) => void;
  updateWaypoint: (wpId: string | number, updates: Partial<Waypoint>) => void;
  deleteWaypoint: (wpId: string | number) => void;
  reorderWaypoints: (fromIndex: number, toIndex: number) => void;

  setIsAddingWaypoint: (isAdding: boolean) => void;
  triggerFitRoute: () => void;
  setHoveredWaypointIndex: (index: number | null) => void;
  setWaypoints: (waypoints: Waypoint[]) => void;
  selectWaypoint: (wpId: string | number | null) => void;
  hydrateFromSnapshot: (missionState: Partial<MissionState>) => void;
  updateFromEvent: (topicOrPartial: string | Partial<MissionState>, payload?: any) => void;
}

export const useMissionStore = create<MissionStoreState>((set, get) => ({
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

  // Command Dispatchers
  startMission: () => {
    set({ state: 'MISSION', active_waypoint_index: 1, mission_progress: 0 });
    commandManager.sendCommand('mission.start', {});
  },

  pauseMission: () => {
    set({ state: 'HOLD' });
    commandManager.sendCommand('mission.pause', {});
  },

  resumeMission: () => {
    set({ state: 'MISSION' });
    commandManager.sendCommand('mission.resume', {});
  },

  abortMission: () => {
    set({ state: 'RTL' });
    commandManager.sendCommand('mission.rtl', { drone_id: 'ALL' });
  },

  restartMission: () => {
    set({ state: 'MISSION', active_waypoint_index: 1, mission_progress: 0 });
    commandManager.sendCommand('mission.restart', {});
  },

  clearMission: () => {
    set({ waypoints: [], active_waypoint_index: 1, mission_progress: 0, distance_remaining: 0, estimated_time_remaining: 0 });
    commandManager.sendCommand('mission.clear', {});
  },

  loadPreset: (presetId: string, centerLat?: number, centerLon?: number) => {
    const preset = MISSION_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const s = get();
    const lat = centerLat ?? s.home_latitude;
    const lon = centerLon ?? s.home_longitude;
    const newWps = preset.generateWaypoints(lat, lon);
    set({ waypoints: newWps, active_waypoint_index: 1, mission_progress: 0 });
    commandManager.sendCommand('mission.set_waypoints', { waypoints: newWps });
  },

  addWaypoint: (wp) => {
    const s = get();
    const nextIdx = s.waypoints.length + 1;
    const newWp: Waypoint = {
      id: `wp-${Date.now()}-${nextIdx}`,
      index: nextIdx,
      latitude: wp.latitude,
      longitude: wp.longitude,
      altitude: wp.altitude ?? 25,
      speed: wp.speed ?? 6,
      command: 'WAYPOINT',
      hold_time: 0,
      acceptance_radius: 2,
    };
    set({ waypoints: [...s.waypoints, newWp] });
    commandManager.sendCommand('mission.add_waypoint', {
      latitude: wp.latitude,
      longitude: wp.longitude,
      altitude: wp.altitude ?? 25,
      speed: wp.speed ?? 6,
    });
  },

  updateWaypoint: (wpId, updates) => {
    const s = get();
    const updated = s.waypoints.map((w) =>
      w.id === wpId || String(w.index) === String(wpId) ? { ...w, ...updates } : w
    );
    set({ waypoints: updated });
    commandManager.sendCommand('mission.update_waypoint', {
      waypoint_id: wpId,
      ...updates,
    });
  },

  deleteWaypoint: (wpId) => {
    const s = get();
    const filtered = s.waypoints
      .filter((w) => w.id !== wpId && String(w.index) !== String(wpId))
      .map((w, i) => ({ ...w, index: i + 1 }));
    set({ waypoints: filtered });
    commandManager.sendCommand('mission.delete_waypoint', { waypoint_id: wpId });
  },

  reorderWaypoints: (fromIndex, toIndex) => {
    const s = get();
    if (fromIndex < 1 || fromIndex > s.waypoints.length || toIndex < 1 || toIndex > s.waypoints.length) return;
    const items = [...s.waypoints];
    const [moved] = items.splice(fromIndex - 1, 1);
    items.splice(toIndex - 1, 0, moved);
    const reindexed = items.map((w, i) => ({ ...w, index: i + 1 }));
    set({ waypoints: reindexed });
    commandManager.sendCommand('mission.reorder_waypoint', { from_index: fromIndex, to_index: toIndex });
  },

  setIsAddingWaypoint: (isAddingWaypoint) => set({ isAddingWaypoint }),
  triggerFitRoute: () => set((s) => ({ fitRouteTrigger: s.fitRouteTrigger + 1 })),
  setHoveredWaypointIndex: (hoveredWaypointIndex) => set({ hoveredWaypointIndex }),
  setWaypoints: (waypoints) => set({ waypoints }),
  selectWaypoint: (selected_waypoint_id) => set({ selected_waypoint_id: selected_waypoint_id ? String(selected_waypoint_id) : null }),

  hydrateFromSnapshot: (missionState) =>
    set((s) => {
      if (!missionState) return s;
      const rawWps = (missionState as any).waypoints;
      let wps = s.waypoints;
      if (Array.isArray(rawWps) && rawWps.length > 0) {
        wps = rawWps.map((w: any, idx: number) => ({
          id: w.id || `wp-${w.index || idx + 1}`,
          index: w.index || idx + 1,
          latitude: Number(w.latitude || w.lat || 0),
          longitude: Number(w.longitude || w.lng || w.lon || 0),
          altitude: Number(w.altitude || w.alt || 25),
          speed: Number(w.speed || 6),
          command: w.command || 'WAYPOINT',
          hold_time: Number(w.hold_time || 0),
          acceptance_radius: Number(w.acceptance_radius || 2),
        }));
      }
      return {
        ...s,
        ...missionState,
        waypoints: wps,
        active_waypoint_index: missionState.active_waypoint_index ?? s.active_waypoint_index,
        mission_progress: missionState.mission_progress ?? s.mission_progress,
        distance_remaining: missionState.distance_remaining ?? s.distance_remaining,
        estimated_time_remaining: missionState.estimated_time_remaining ?? s.estimated_time_remaining,
        state: missionState.state || s.state,
      };
    }),

  updateFromEvent: (topicOrPartial, payload) =>
    set((s) => {
      if (typeof topicOrPartial === 'object') {
        return { ...s, ...topicOrPartial };
      }
      if (topicOrPartial === 'mission.started') {
        return {
          ...s,
          state: 'MISSION',
          active_waypoint_index: payload?.active_waypoint_index ?? 1,
          mission_progress: payload?.mission_progress ?? 0,
        };
      }
      if (topicOrPartial === 'mission.paused') return { ...s, state: 'HOLD' };
      if (topicOrPartial === 'mission.resumed') return { ...s, state: 'MISSION' };
      if (topicOrPartial === 'mission.rtl') return { ...s, state: 'RTL' };
      if (topicOrPartial === 'mission.completed') {
        return { ...s, state: 'COMPLETED', mission_progress: 100 };
      }
      if (topicOrPartial === 'mission.waypoint_reached' && payload) {
        return {
          ...s,
          active_waypoint_index: payload.waypoint_index,
          mission_progress: payload.mission_progress ?? s.mission_progress,
          distance_remaining: payload.distance_remaining ?? s.distance_remaining,
          estimated_time_remaining: payload.estimated_time_remaining ?? s.estimated_time_remaining,
        };
      }
      if (topicOrPartial === 'mission.updated' && payload) {
        const m = payload.mission || payload;
        return {
          ...s,
          state: m.state || s.state,
          active_waypoint_index: m.active_waypoint_index ?? s.active_waypoint_index,
          mission_progress: m.mission_progress ?? s.mission_progress,
          distance_remaining: m.distance_remaining ?? s.distance_remaining,
          estimated_time_remaining: m.estimated_time_remaining ?? s.estimated_time_remaining,
        };
      }
      return s;
    }),
}));
