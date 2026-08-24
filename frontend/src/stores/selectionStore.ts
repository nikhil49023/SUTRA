import { create } from 'zustand';
import { SelectedObjectType, SelectionState } from '../types/app';

interface SelectionStoreState extends SelectionState {
  selectObject: (type: SelectedObjectType, id: string | null) => void;
  selectDrone: (droneId: string) => void;
  selectWaypoint: (waypointId: string | number) => void;
  selectGeofence: (geofenceId: string) => void;
  clearSelection: () => void;
  setHoveredId: (id: string | null) => void;
}

export const useSelectionStore = create<SelectionStoreState>((set) => ({
  selected_type: 'NONE',
  selected_id: null,
  hovered_id: null,

  selectObject: (selected_type, selected_id) => set({ selected_type, selected_id }),
  selectDrone: (droneId) => set({ selected_type: 'DRONE', selected_id: droneId }),
  selectWaypoint: (waypointId) => set({ selected_type: 'WAYPOINT', selected_id: String(waypointId) }),
  selectGeofence: (geofenceId) => set({ selected_type: 'GEOFENCE', selected_id: geofenceId }),
  clearSelection: () => set({ selected_type: 'NONE', selected_id: null }),
  setHoveredId: (hovered_id) => set({ hovered_id }),
}));
