export type ZoneType = 'NO_FLY' | 'WARNING' | 'SAFE' | 'INCLUSION' | 'EXCLUSION';

export type GeometryType = 'POLYGON' | 'CIRCLE' | 'CORRIDOR';

export interface Geofence {
  id: string;
  name: string;
  zone_type: ZoneType;
  geometry_type: GeometryType;
  coordinates: [number, number][]; // [lat, lon][]
  center?: [number, number] | null; // [lat, lon]
  radius?: number; // meters for circle
  corridor_width?: number; // meters for corridor
  altitude_min: number; // AGL meters
  altitude_max: number; // AGL meters
  priority?: number; // 1 (lowest) to 5 (highest/critical)
  enabled: boolean;
  visible: boolean;
  action?: string;
  area_sqm?: number;
  perimeter_m?: number;
  created_at?: number;
  description?: string;
}

export interface GeofenceState {
  geofences: Geofence[];
  selected_geofence_id: string | null;
  drawing_mode: boolean;
  drawing_points: [number, number][];
  preview_point?: [number, number] | null;
  editing_vertex?: number | null;
  active_zone_type: ZoneType;
  active_geometry_type: GeometryType;
}
