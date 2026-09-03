import { create } from 'zustand';
import { Geofence, GeofenceState, GeometryType, ZoneType } from '../types/geofence';
import { Waypoint } from '../types/mission';
import { commandManager } from '../communication/CommandManager';

export type GeofenceStatusFilter = 'ALL' | 'ENABLED' | 'DISABLED' | 'VISIBLE' | 'HIDDEN';

/** Normalize an incoming geofence object, ensuring required fields and correct defaults */
export function normalizeGeofence(raw: any): Geofence {
  return {
    id: raw.id ?? `gf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: raw.name ?? 'Unnamed Airspace Zone',
    zone_type: (raw.zone_type ?? raw.type ?? 'NO_FLY') as ZoneType,
    geometry_type: (raw.geometry_type ?? 'POLYGON') as GeometryType,
    coordinates: Array.isArray(raw.coordinates)
      ? raw.coordinates.map((c: any) =>
          Array.isArray(c)
            ? ([c[0], c[1]] as [number, number])
            : ([c.lat ?? c.latitude ?? 0, c.lng ?? c.longitude ?? 0] as [number, number])
        )
      : [],
    center: raw.center
      ? Array.isArray(raw.center)
        ? ([raw.center[0], raw.center[1]] as [number, number])
        : ([raw.center.lat ?? raw.center.latitude, raw.center.lng ?? raw.center.longitude] as [number, number])
      : null,
    radius: typeof raw.radius === 'number' ? raw.radius : 200,
    corridor_width: typeof raw.corridor_width === 'number' ? raw.corridor_width : 50,
    altitude_min: typeof raw.altitude_min === 'number' ? raw.altitude_min : 0,
    altitude_max: typeof raw.altitude_max === 'number' ? raw.altitude_max : 120,
    priority: typeof raw.priority === 'number' ? raw.priority : 3,
    enabled: raw.enabled !== false,
    visible: raw.visible !== false,
    action: raw.action,
    area_sqm: raw.area_sqm,
    perimeter_m: raw.perimeter_m,
    created_at: raw.created_at ?? Date.now(),
  };
}

/** Ray-casting algorithm to test if (lat, lon) is inside a polygon of [lat, lon][] */
function isPointInPolygon(lat: number, lon: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect = yi > lon !== yj > lon && lat < ((xj - xi) * (lon - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Haversine distance between two [lat, lon] points in meters */
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface GeofenceStoreState extends GeofenceState {
  searchQuery: string;
  typeFilter: 'ALL' | ZoneType;
  filterType: 'ALL' | ZoneType;
  statusFilter: GeofenceStatusFilter;

  setSearchQuery: (query: string) => void;
  setTypeFilter: (filter: 'ALL' | ZoneType) => void;
  setFilterType: (filter: 'ALL' | ZoneType) => void;
  setStatusFilter: (status: GeofenceStatusFilter) => void;
  setGeofences: (geofences: Geofence[]) => void;
  updateGeofence: (id: string, partial: Partial<Geofence>) => void;
  deleteGeofence: (id: string) => void;
  duplicateGeofence: (id: string) => Geofence | null;
  toggleGeofenceEnabled: (id: string) => void;
  toggleGeofenceVisible: (id: string) => void;
  setAllGeofencesEnabled: (enabled: boolean) => void;
  setAllGeofencesVisible: (visible: boolean) => void;
  batchUpdateGeofences: (ids: string[], updates: Partial<Geofence>) => void;
  batchDeleteGeofences: (ids: string[]) => void;
  clearAllGeofences: () => void;
  addVertexToGeofence: (id: string, index: number, coord: [number, number]) => void;
  removeVertexFromGeofence: (id: string, index: number) => void;
  startDrawing: (zone_type?: ZoneType, geometry_type?: GeometryType) => void;
  addDrawingPoint: (lat: number, lon: number) => void;
  updatePreviewPoint: (arg1: [number, number] | number | null, arg2?: number) => void;
  undoDrawingPoint: () => void;
  cancelDrawing: () => void;
  hydrateFromSnapshot: (state: Partial<GeofenceState>) => void;
  updateFromEvent: (topic: string, payload: any) => void;
  importGeoJSON: (geojsonStr: string) => { success: boolean; importedCount: number; errors: string[] };
  exportGeoJSON: () => string;
  validateMissionAgainstGeofences: (
    waypoints: Waypoint[],
    homeLat?: number,
    homeLon?: number
  ) => { valid: boolean; errors: string[]; warnings: string[] };
}

export const useGeofenceStore = create<GeofenceStoreState>((set, get) => ({
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
      priority: 5,
      enabled: true,
      visible: true,
      created_at: Date.now() - 3600000,
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
      priority: 3,
      enabled: true,
      visible: true,
      created_at: Date.now() - 1800000,
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
  statusFilter: 'ALL',

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setTypeFilter: (typeFilter) => set({ typeFilter, filterType: typeFilter }),
  setFilterType: (filterType) => set({ filterType, typeFilter: filterType }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
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

  duplicateGeofence: (id) => {
    const existing = get().geofences.find((g) => g.id === id);
    if (!existing) return null;

    const newId = `gf-${Date.now()}`;
    const duplicated: Geofence = {
      ...existing,
      id: newId,
      name: `${existing.name} (Copy)`,
      created_at: Date.now(),
    };

    set((s) => ({
      geofences: [...s.geofences, duplicated],
      selected_geofence_id: newId,
    }));

    commandManager.sendCommand('geofence.create', {
      name: duplicated.name,
      zone_type: duplicated.zone_type,
      geometry_type: duplicated.geometry_type,
      coordinates: duplicated.coordinates,
      center: duplicated.center,
      radius: duplicated.radius,
      corridor_width: duplicated.corridor_width,
      altitude_min: duplicated.altitude_min,
      altitude_max: duplicated.altitude_max,
      priority: duplicated.priority,
      enabled: duplicated.enabled,
      visible: duplicated.visible,
    });

    return duplicated;
  },

  toggleGeofenceEnabled: (id) => {
    const existing = get().geofences.find((g) => g.id === id);
    if (!existing) return;
    const newEnabled = !existing.enabled;
    get().updateGeofence(id, { enabled: newEnabled });
    commandManager.sendCommand('geofence.update', { geofence_id: id, enabled: newEnabled });
  },

  toggleGeofenceVisible: (id) => {
    const existing = get().geofences.find((g) => g.id === id);
    if (!existing) return;
    const newVisible = !existing.visible;
    get().updateGeofence(id, { visible: newVisible });
    commandManager.sendCommand('geofence.update', { geofence_id: id, visible: newVisible });
  },

  setAllGeofencesEnabled: (enabled) => {
    const gfs = get().geofences;
    set((s) => ({ geofences: s.geofences.map((g) => ({ ...g, enabled })) }));
    gfs.forEach((g) => {
      commandManager.sendCommand('geofence.update', { geofence_id: g.id, enabled });
    });
  },

  setAllGeofencesVisible: (visible) => {
    const gfs = get().geofences;
    set((s) => ({ geofences: s.geofences.map((g) => ({ ...g, visible })) }));
    gfs.forEach((g) => {
      commandManager.sendCommand('geofence.update', { geofence_id: g.id, visible });
    });
  },

  batchUpdateGeofences: (ids, updates) => {
    set((s) => ({
      geofences: s.geofences.map((g) => (ids.includes(g.id) ? { ...g, ...updates } : g)),
    }));
    ids.forEach((id) => {
      const gf = get().geofences.find((g) => g.id === id);
      if (gf) {
        commandManager.sendCommand('geofence.update', {
          geofence_id: id,
          ...updates,
          coordinates: gf.coordinates,
          center: gf.center,
        });
      }
    });
  },

  batchDeleteGeofences: (ids) => {
    set((s) => ({
      geofences: s.geofences.filter((g) => !ids.includes(g.id)),
      selected_geofence_id: ids.includes(s.selected_geofence_id || '') ? null : s.selected_geofence_id,
    }));
    ids.forEach((id) => {
      commandManager.sendCommand('geofence.delete', { geofence_id: id });
    });
  },

  clearAllGeofences: () => {
    const gfs = get().geofences;
    gfs.forEach((g) => {
      commandManager.sendCommand('geofence.delete', { geofence_id: g.id });
    });
    set({ geofences: [], selected_geofence_id: null });
  },

  addVertexToGeofence: (id, index, coord) => {
    const target = get().geofences.find((g) => g.id === id);
    if (!target) return;
    const newCoords = [...target.coordinates];
    newCoords.splice(index, 0, coord);
    get().updateGeofence(id, { coordinates: newCoords });
    commandManager.sendCommand('geofence.update', {
      geofence_id: id,
      coordinates: newCoords,
    });
  },

  removeVertexFromGeofence: (id, index) => {
    const target = get().geofences.find((g) => g.id === id);
    if (!target || target.coordinates.length <= 3) return;
    const newCoords = target.coordinates.filter((_, i) => i !== index);
    get().updateGeofence(id, { coordinates: newCoords });
    commandManager.sendCommand('geofence.update', {
      geofence_id: id,
      coordinates: newCoords,
    });
  },

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
        const filtered = s.geofences.filter(
          (g) => !g.id.startsWith('gf-optimistic-') && g.id !== incoming.id
        );
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

  exportGeoJSON: () => {
    const gfs = get().geofences;
    const features = gfs.map((g) => {
      let geometry: any;
      if (g.geometry_type === 'CIRCLE' && g.center) {
        geometry = {
          type: 'Point',
          coordinates: [g.center[1], g.center[0]],
        };
      } else if (g.geometry_type === 'CORRIDOR') {
        geometry = {
          type: 'LineString',
          coordinates: g.coordinates.map((c) => [c[1], c[0]]),
        };
      } else {
        const coords = [...g.coordinates];
        if (coords.length > 0 && (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1])) {
          coords.push(coords[0]);
        }
        geometry = {
          type: 'Polygon',
          coordinates: [coords.map((c) => [c[1], c[0]])],
        };
      }

      return {
        type: 'Feature',
        id: g.id,
        properties: {
          id: g.id,
          name: g.name,
          zone_type: g.zone_type,
          geometry_type: g.geometry_type,
          altitude_min: g.altitude_min,
          altitude_max: g.altitude_max,
          priority: g.priority ?? 3,
          radius: g.radius,
          corridor_width: g.corridor_width,
          enabled: g.enabled,
          visible: g.visible,
          created_at: g.created_at,
        },
        geometry,
      };
    });

    return JSON.stringify(
      {
        type: 'FeatureCollection',
        name: 'SmartHorizon_GCS_Geofences',
        features,
      },
      null,
      2
    );
  },

  importGeoJSON: (geojsonStr: string) => {
    const errors: string[] = [];
    let parsed: any;
    try {
      parsed = JSON.parse(geojsonStr);
    } catch (e: any) {
      return { success: false, importedCount: 0, errors: [`Invalid JSON: ${e.message}`] };
    }

    const featureList = parsed.type === 'FeatureCollection' ? parsed.features : parsed.type === 'Feature' ? [parsed] : [];
    if (!Array.isArray(featureList) || featureList.length === 0) {
      return { success: false, importedCount: 0, errors: ['No valid GeoJSON features found.'] };
    }

    const newGfs: Geofence[] = [];

    featureList.forEach((feat: any, idx: number) => {
      const props = feat.properties || {};
      const geom = feat.geometry || {};

      let geomType: GeometryType = 'POLYGON';
      let coords: [number, number][] = [];
      let center: [number, number] | null = null;
      let radius = props.radius || 200;
      let corridorWidth = props.corridor_width || 50;

      if (geom.type === 'Polygon' && Array.isArray(geom.coordinates) && geom.coordinates[0]) {
        geomType = 'POLYGON';
        coords = geom.coordinates[0].map((c: any) => [c[1], c[0]] as [number, number]);
      } else if (geom.type === 'LineString' && Array.isArray(geom.coordinates)) {
        geomType = 'CORRIDOR';
        coords = geom.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
      } else if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
        geomType = 'CIRCLE';
        center = [geom.coordinates[1], geom.coordinates[0]];
      } else {
        errors.push(`Feature #${idx + 1}: Unsupported geometry type '${geom.type}'`);
        return;
      }

      const gf = normalizeGeofence({
        id: props.id || `gf-import-${Date.now()}-${idx}`,
        name: props.name || `Imported Zone #${idx + 1}`,
        zone_type: props.zone_type || props.type || 'NO_FLY',
        geometry_type: props.geometry_type || geomType,
        coordinates: coords,
        center,
        radius,
        corridor_width: corridorWidth,
        altitude_min: props.altitude_min ?? 0,
        altitude_max: props.altitude_max ?? 120,
        priority: props.priority ?? 3,
        enabled: props.enabled !== false,
        visible: props.visible !== false,
      });

      newGfs.push(gf);

      // Send to backend
      commandManager.sendCommand('geofence.create', {
        name: gf.name,
        zone_type: gf.zone_type,
        geometry_type: gf.geometry_type,
        coordinates: gf.coordinates,
        center: gf.center,
        radius: gf.radius,
        corridor_width: gf.corridor_width,
        altitude_min: gf.altitude_min,
        altitude_max: gf.altitude_max,
        priority: gf.priority,
        enabled: gf.enabled,
        visible: gf.visible,
      });
    });

    if (newGfs.length > 0) {
      set((s) => ({ geofences: [...s.geofences, ...newGfs] }));
      return { success: true, importedCount: newGfs.length, errors };
    }

    return { success: false, importedCount: 0, errors };
  },

  validateMissionAgainstGeofences: (waypoints, homeLat, homeLon) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const activeGfs = get().geofences.filter((g) => g.enabled);

    if (!waypoints || waypoints.length === 0 || activeGfs.length === 0) {
      return { valid: true, errors, warnings };
    }

    waypoints.forEach((wp) => {
      activeGfs.forEach((gf) => {
        // Vertical window check
        if (wp.altitude < gf.altitude_min || wp.altitude > gf.altitude_max) {
          return; // Altitude clear
        }

        let isBreach = false;
        if (gf.geometry_type === 'CIRCLE' && gf.center) {
          const dist = calculateDistanceMeters(wp.latitude, wp.longitude, gf.center[0], gf.center[1]);
          if (dist <= (gf.radius ?? 200)) isBreach = true;
        } else if (gf.coordinates && gf.coordinates.length >= 3) {
          isBreach = isPointInPolygon(wp.latitude, wp.longitude, gf.coordinates);
        }

        if (isBreach) {
          if (gf.zone_type === 'NO_FLY') {
            errors.push(
              `WP #${wp.index} (alt ${wp.altitude}m) violates NO_FLY zone '${gf.name}' (limits: ${gf.altitude_min}–${gf.altitude_max}m AGL).`
            );
          } else if (gf.zone_type === 'WARNING') {
            warnings.push(
              `WP #${wp.index} enters WARNING zone '${gf.name}'.`
            );
          }
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  },
}));
