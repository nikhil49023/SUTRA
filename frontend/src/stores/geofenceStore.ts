import { create } from 'zustand';
import { Geofence, GeofenceState, GeometryType, ZoneType } from '../types/geofence';

interface GeofenceStoreState extends GeofenceState {
  searchQuery: string;
  typeFilter: 'ALL' | ZoneType;
  filterType: 'ALL' | ZoneType;

  setSearchQuery: (query: string) => void;
  setTypeFilter: (filter: 'ALL' | ZoneType) => void;
  setFilterType: (filter: 'ALL' | ZoneType) => void;
  setGeofences: (geofences: Geofence[]) => void;
  updateGeofence: (id: string, partial: Partial<Geofence>) => void;
  deleteGeofence: (id: string) => void;
  startDrawing: (zone_type?: ZoneType, geometry_type?: GeometryType) => void;
  addDrawingPoint: (lat: number, lon: number) => void;
  updatePreviewPoint: (arg1: [number, number] | number | null, arg2?: number) => void;
  undoDrawingPoint: () => void;
  cancelDrawing: () => void;
  hydrateFromSnapshot: (state: Partial<GeofenceState>) => void;
  updateFromEvent: (topic: string, payload: any) => void;
}

export const useGeofenceStore = create<GeofenceStoreState>((set) => ({
  geofences: [
    {
      id: 'gf-1',
      name: 'Downtown Heliport NFZ',
      zone_type: 'NO_FLY',
      geometry_type: 'POLYGON',
      coordinates: [
        [37.7735, -122.421],
        [37.7735, -122.417],
        [37.771, -122.417],
        [37.771, -122.421],
      ],
      altitude_min: 0,
      altitude_max: 120,
      enabled: true,
      visible: true,
    },
    {
      id: 'gf-2',
      name: 'Harbor Perimeter Warning',
      zone_type: 'WARNING',
      geometry_type: 'POLYGON',
      coordinates: [
        [37.779, -122.424],
        [37.781, -122.418],
        [37.778, -122.415],
      ],
      altitude_min: 0,
      altitude_max: 200,
      enabled: true,
      visible: true,
    },
  ],
  selected_geofence_id: null,
  active_zone_type: 'NO_FLY',
  active_geometry_type: 'POLYGON',
  drawing_mode: false,
  drawing_points: [],
  preview_point: null,
  editing_vertex: null,
  searchQuery: '',
  typeFilter: 'ALL',
  filterType: 'ALL',

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setTypeFilter: (typeFilter) => set({ typeFilter, filterType: typeFilter }),
  setFilterType: (filterType) => set({ filterType, typeFilter: filterType }),
  setGeofences: (geofences) => set({ geofences }),
  updateGeofence: (id, partial) =>
    set((s) => ({
      geofences: s.geofences.map((g) => (g.id === id ? { ...g, ...partial } : g)),
    })),
  deleteGeofence: (id) =>
    set((s) => ({
      geofences: s.geofences.filter((g) => g.id !== id),
    })),
  startDrawing: (zone_type = 'NO_FLY', geometry_type = 'POLYGON') =>
    set({
      drawing_mode: true,
      drawing_points: [],
      preview_point: null,
      active_zone_type: zone_type,
      active_geometry_type: geometry_type,
    }),
  addDrawingPoint: (lat, lon) =>
    set((s) => ({
      drawing_points: [...s.drawing_points, [lat, lon]],
    })),
  updatePreviewPoint: (arg1, arg2) =>
    set(() => {
      if (typeof arg1 === 'number' && typeof arg2 === 'number') {
        return { preview_point: [arg1, arg2] };
      }
      return { preview_point: arg1 as [number, number] | null };
    }),
  undoDrawingPoint: () =>
    set((s) => ({
      drawing_points: s.drawing_points.slice(0, -1),
    })),
  cancelDrawing: () =>
    set({
      drawing_mode: false,
      drawing_points: [],
      preview_point: null,
    }),
  hydrateFromSnapshot: (state) => set((s) => ({ ...s, ...state })),
  updateFromEvent: (topic, payload) =>
    set((s) => {
      if (topic === 'geofence.created' && payload && payload.geofence) {
        return { geofences: [...s.geofences, payload.geofence] };
      }
      if (topic === 'geofence.deleted' && payload && payload.geofence_id) {
        return { geofences: s.geofences.filter((g) => g.id !== payload.geofence_id) };
      }
      return s;
    }),
}));
