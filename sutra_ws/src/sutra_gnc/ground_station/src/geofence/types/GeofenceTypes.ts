import type {
  Feature,
  FeatureCollection,
  Polygon,
  Position,
} from "geojson";

/* ============================================================
   Zone & Geometry Types
============================================================ */

export type ZoneType = "NO_FLY" | "WARNING" | "SAFE" | "CORRIDOR";
export const ZoneType = {
  NO_FLY: "NO_FLY" as const,
  WARNING: "WARNING" as const,
  SAFE: "SAFE" as const,
  CORRIDOR: "CORRIDOR" as const,
};

export type GeometryType = "POLYGON" | "CIRCLE" | "CORRIDOR";
export const GeometryType = {
  POLYGON: "POLYGON" as const,
  CIRCLE: "CIRCLE" as const,
  CORRIDOR: "CORRIDOR" as const,
};

/* ============================================================
   Interaction Modes
============================================================ */

export type InteractionMode =
  | "IDLE"
  | "DRAW"
  | "EDIT"
  | "MOVE"
  | "DRAG_VERTEX"
  | "SELECT";
export const InteractionMode = {
  IDLE: "IDLE" as const,
  DRAW: "DRAW" as const,
  EDIT: "EDIT" as const,
  MOVE: "MOVE" as const,
  DRAG_VERTEX: "DRAG_VERTEX" as const,
  SELECT: "SELECT" as const,
};

/* ============================================================
   Vertex
============================================================ */

export interface Vertex {
  id: string;
  lat: number;
  lng: number;
}

/* ============================================================
   Geofence Properties
============================================================ */

export interface GeofenceProperties {
  id: string;
  name: string;
  type: ZoneType;
  geometryType: GeometryType;
  color: string;
  visible: boolean;
  locked: boolean;
  altitudeMin: number;
  altitudeMax: number;
  areaSqMeters: number;
  perimeterMeters: number;
  radiusMeters?: number;
  corridorWidthMeters?: number;
  createdAt: string;
  updatedAt: string;
}

/* ============================================================
   GeoJSON Feature
============================================================ */

export type GeofenceFeature = Feature<
  Polygon,
  GeofenceProperties
>;

export type GeofenceCollection = FeatureCollection<
  Polygon,
  GeofenceProperties
>;

/* ============================================================
   Drawing State
============================================================ */

export interface DrawingState {
  vertices: Position[];
  preview: Position | null;
  activeZoneType: ZoneType;
  activeGeometryType: GeometryType;
}

/* ============================================================
   Selection State
============================================================ */

export interface SelectionState {
  selectedGeofenceId: string | null;
  selectedVertexIndex: number | null;
}

/* ============================================================
   Drag State
============================================================ */

export interface DragState {
  isDragging: boolean;
  dragVertexIndex: number | null;
}

/* ============================================================
   Complete Store State
============================================================ */

export interface GeofenceState {
  collection: GeofenceCollection;
  interactionMode: InteractionMode;
  drawing: DrawingState;
  selection: SelectionState;
  drag: DragState;
}

/* ============================================================
   Default Zone Colors
============================================================ */

export const ZONE_COLORS: Record<
  ZoneType,
  {
    fill: string;
    outline: string;
  }
> = {
  [ZoneType.NO_FLY]: {
    fill: "rgba(239,68,68,0.25)",
    outline: "#ef4444",
  },
  [ZoneType.WARNING]: {
    fill: "rgba(245,158,11,0.25)",
    outline: "#f59e0b",
  },
  [ZoneType.SAFE]: {
    fill: "rgba(16,185,129,0.25)",
    outline: "#10b981",
  },
  [ZoneType.CORRIDOR]: {
    fill: "rgba(59,130,246,0.25)",
    outline: "#3b82f6",
  },
};