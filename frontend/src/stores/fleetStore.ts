import { create } from 'zustand';
import { DroneState, FleetState, FormationType } from '../types/fleet';

interface FleetStoreState extends FleetState {
  selectedDroneId: string;
  setSelectedDroneId: (droneId: string) => void;
  hydrateFromSnapshot: (fleetState: Partial<FleetState>) => void;
  updateDroneState: (droneId: string, dronePartial: Partial<DroneState>) => void;
  addDrone: (drone: DroneState) => void;
  removeDrone: (droneId: string) => void;
  updateFormation: (formation: FormationType, spacing?: number) => void;
  setLeader: (droneId: string) => void;
  setShowGuides: (show: boolean) => void;
  setGuidesVisible: (show: boolean) => void;
  updateFromEvent: (topic: string, payload: any) => void;
}

export const useFleetStore = create<FleetStoreState>((set) => ({
  drones: {
    drone_alpha: {
      drone_id: 'drone_alpha',
      callsign: 'ALPHA (LEADER)',
      role: 'LEADER',
      latitude: 37.774929,
      longitude: -122.419416,
      altitude: 25.0,
      heading: 45.0,
      pitch: 0.0,
      roll: 0.0,
      speed: 6.5,
      battery: 98.0,
      connection_status: 'CONNECTED',
      flight_mode: 'MISSION',
      is_leader: true,
      formation_index: 0,
      offset_x: 0,
      offset_y: 0,
      formation: 'V_FORMATION',
    },
    drone_bravo: {
      drone_id: 'drone_bravo',
      callsign: 'BRAVO (WINGMAN)',
      role: 'WINGMAN',
      latitude: 37.77478,
      longitude: -122.41965,
      altitude: 25.0,
      heading: 45.0,
      pitch: 0.0,
      roll: 0.0,
      speed: 6.5,
      battery: 95.0,
      connection_status: 'CONNECTED',
      flight_mode: 'MISSION',
      is_leader: false,
      formation_index: 1,
      offset_x: -25,
      offset_y: -25,
      formation: 'V_FORMATION',
    },
    drone_charlie: {
      drone_id: 'drone_charlie',
      callsign: 'CHARLIE (SCOUT)',
      role: 'SCOUT',
      latitude: 37.77478,
      longitude: -122.41918,
      altitude: 25.0,
      heading: 45.0,
      pitch: 0.0,
      roll: 0.0,
      speed: 6.5,
      battery: 92.0,
      connection_status: 'CONNECTED',
      flight_mode: 'MISSION',
      is_leader: false,
      formation_index: 2,
      offset_x: 25,
      offset_y: -25,
      formation: 'V_FORMATION',
    },
    drone_delta: {
      drone_id: 'drone_delta',
      callsign: 'DELTA (SUPPORT)',
      role: 'SUPPORT',
      latitude: 37.77462,
      longitude: -122.41985,
      altitude: 25.0,
      heading: 45.0,
      pitch: 0.0,
      roll: 0.0,
      speed: 6.5,
      battery: 89.0,
      connection_status: 'CONNECTED',
      flight_mode: 'MISSION',
      is_leader: false,
      formation_index: 3,
      offset_x: -50,
      offset_y: -50,
      formation: 'V_FORMATION',
    },
  },
  leader_id: 'drone_alpha',
  formation: 'V_FORMATION',
  spacing: 25.0,
  formation_heading: null,
  follow_leader_heading: true,
  show_guides: true,
  selectedDroneId: 'drone_alpha',

  setSelectedDroneId: (droneId) => set({ selectedDroneId: droneId }),
  hydrateFromSnapshot: (fleetState) =>
    set((s) => {
      const mergedDrones = fleetState.drones || s.drones;
      const leaderId = fleetState.leader_id || s.leader_id || Object.keys(mergedDrones)[0] || 'drone_alpha';
      return {
        ...s,
        ...fleetState,
        drones: mergedDrones,
        leader_id: leaderId,
      };
    }),
  updateDroneState: (droneId, dronePartial) =>
    set((s) => {
      const existing = s.drones[droneId];
      if (!existing) {
        // Drone exists on backend but not in local store yet — add it
        return {
          drones: {
            ...s.drones,
            [droneId]: {
              drone_id: droneId,
              callsign: dronePartial.callsign || droneId.toUpperCase(),
              role: dronePartial.role || 'WINGMAN',
              latitude: dronePartial.latitude || 37.774929,
              longitude: dronePartial.longitude || -122.419416,
              altitude: dronePartial.altitude || 25.0,
              heading: dronePartial.heading || 0.0,
              pitch: dronePartial.pitch || 0.0,
              roll: dronePartial.roll || 0.0,
              speed: dronePartial.speed || 0.0,
              battery: dronePartial.battery || 100.0,
              connection_status: dronePartial.connection_status || 'CONNECTED',
              flight_mode: dronePartial.flight_mode || 'MISSION',
              is_leader: dronePartial.is_leader || false,
              formation_index: dronePartial.formation_index || 0,
              offset_x: dronePartial.offset_x || 0,
              offset_y: dronePartial.offset_y || 0,
              formation: s.formation,
              ...dronePartial,
            } as DroneState,
          },
        };
      }
      return {
        drones: {
          ...s.drones,
          [droneId]: { ...existing, ...dronePartial },
        },
      };
    }),
  addDrone: (drone) =>
    set((s) => ({
      drones: {
        ...s.drones,
        [drone.drone_id]: drone,
      },
    })),
  removeDrone: (droneId) =>
    set((s) => {
      const copy = { ...s.drones };
      delete copy[droneId];
      return {
        drones: copy,
        selectedDroneId: s.selectedDroneId === droneId ? (Object.keys(copy)[0] || 'drone_alpha') : s.selectedDroneId,
      };
    }),
  updateFormation: (formation, spacing) =>
    set((s) => ({
      formation,
      spacing: spacing !== undefined ? spacing : s.spacing,
    })),
  setLeader: (leader_id) => set({ leader_id }),
  setShowGuides: (show_guides) => set({ show_guides }),
  setGuidesVisible: (show_guides) => set({ show_guides }),
  updateFromEvent: (topic, payload) =>
    set((s) => {
      if (topic === 'fleet.formation_changed' && payload) {
        return {
          ...s,
          formation: payload.formation || s.formation,
          spacing: payload.spacing !== undefined ? payload.spacing : s.spacing,
        };
      }
      if (topic === 'fleet.drone_updated' && payload && payload.leader_id) {
        return { ...s, leader_id: payload.leader_id };
      }
      if (topic === 'fleet.drone_added' && payload && payload.drone) {
        return {
          drones: {
            ...s.drones,
            [payload.drone.drone_id]: payload.drone,
          },
        };
      }
      if (topic === 'fleet.drone_removed' && payload && payload.drone_id) {
        const copy = { ...s.drones };
        delete copy[payload.drone_id];
        return { drones: copy };
      }
      if (topic === 'fleet.drone_position_updated' && payload && payload.drone_id) {
        const existing = s.drones[payload.drone_id];
        if (!existing) return s;
        return {
          drones: {
            ...s.drones,
            [payload.drone_id]: {
              ...existing,
              latitude: payload.position?.latitude ?? existing.latitude,
              longitude: payload.position?.longitude ?? existing.longitude,
              altitude: payload.position?.altitude ?? existing.altitude,
              heading: payload.heading ?? existing.heading,
              speed: payload.speed ?? existing.speed,
              battery: payload.battery ?? existing.battery,
              flight_mode: payload.flight_mode ?? existing.flight_mode,
              target_latitude: payload.target_position?.latitude ?? existing.target_latitude,
              target_longitude: payload.target_position?.longitude ?? existing.target_longitude,
            },
          },
        };
      }
      return s;
    }),
}));
