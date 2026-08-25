import { create } from 'zustand';
import { Geofence, GeofenceState, GeometryType, ZoneType } from '../types/geofence';

/** Normalize an incoming geofence object, ensuring required fields and correct defaults */
function normalizeGeofence(raw: any): Geofence {
  return {
    id: raw.id ?? `gf-${Date.now()}`,
    name: raw.name ?? 'Unnamed Zone',
    zone_type: (raw.zone_type ?? raw.type ?? 'NO_FLY') as ZoneType,
    geometry_type: (raw.geometry_type ?? 'POLYGON') as GeometryType,
    coordinates: Array.isArray(raw.coordinates)
      ? raw.coordinates.map((c: any) =>
          Array.isArray(c) ? ([c[0], c[1]] as [number, number]) : [c.lat ?? c.latitude ?? 0, c.lng ?? c.longitude ?? 0] as [number, number]
        )
      : [],
    center: raw.center ?? null,
    radius: raw.radius ?? 200,
    corridor_width: raw.corridor_width ?? 50,
    altitude_min: raw.altitude_min ?? 0,
    altitude_max: raw.altitude_max ?? 120,
    enabled: raw.enabled !== false,
    // CRITICAL: default visible to true if missing/undefined
    visible: raw.visible !== false,
    action: raw.action,
    area_sqm: raw.area_sqm,
    perimeter_m: raw.perimeter_m,
    created_at: raw.created_at,
  };
}

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
  setGeofences: (geofences) => set({ geofences: geofences.map(normalizeGeofence) }),
  updateGeofence: (id, partial) =>
    set((s) => ({
      geofences: s.geofences.map((g) => (g.id === id ? { ...g, ...partial } : g)),
    })),
  deleteGeofence: (id) =>
    set((s) => ({
      geofences: s.geofences.filter((g) => g.id !== id),
      selected_geofence_id: s.selected_geofence_id === id ? null : s.selected_geofence_id,
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
  hydrateFromSnapshot: (state) =>
    set((s) => ({
      ...s,
      ...state,
      geofences: Array.isArray((state as any).geofences)
        ? (state as any).geofences.map(normalizeGeofence)
        : s.geofences,
    })),
  updateFromEvent: (topic, payload) =>
    set((s) => {
      if (topic === 'geofence.created' && payload && payload.geofence) {
        const incoming = normalizeGeofence(payload.geofence);
        // Remove any optimistic placeholder, then add authoritative fence
        const filtered = s.geofences.filter(
          (g) => !g.id.startsWith('gf-optimistic-') && g.id !== incoming.id
        );
        console.log('[GEOFENCE CREATED]', {
          id: incoming.id,
          name: incoming.name,
          type: incoming.zone_type,
          geometry: incoming.geometry_type,
          coordinates: incoming.coordinates,
          visible: incoming.visible,
        });
        return { geofences: [...filtered, incoming] };
      }
      if (topic === 'geofence.updated' && payload && payload.geofence) {
        const updated = normalizeGeofence(payload.geofence);
        const exists = s.geofences.some((g) => g.id === updated.id);
        if (exists) {
          return { geofences: s.geofences.map((g) => (g.id === updated.id ? updated : g)) };
        }
        return { geofences: [...s.geofences, updated] };
      }
      if (topic === 'geofence.deleted' && payload && payload.geofence_id) {
        return {
          geofences: s.geofences.filter((g) => g.id !== payload.geofence_id),
          selected_geofence_id:
            s.selected_geofence_id === payload.geofence_id ? null : s.selected_geofence_id,
        };
      }
      return s;
    }),
}));

