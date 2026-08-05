// Geofence Store
import type {
  GeofenceCollection,
  GeofenceState,
  InteractionMode,
  ZoneType,
} from "../types/GeofenceTypes";

type Listener = (state: GeofenceState) => void;

const initialCollection: GeofenceCollection = {
  type: "FeatureCollection",
  features: [],
};

const initialState: GeofenceState = {
  collection: initialCollection,
  interactionMode: "IDLE" as InteractionMode,
  drawing: {
    vertices: [],
    preview: null,
    activeZoneType: "NO_FLY" as ZoneType,
    activeGeometryType: "POLYGON" as any,
  },
  selection: {
    selectedGeofenceId: null,
    selectedVertexIndex: null,
  },
  drag: {
    isDragging: false,
    dragVertexIndex: null,
  },
};

export class GeofenceStore {
  private state: GeofenceState = { ...initialState };
  private listeners: Set<Listener> = new Set();

  getState(): GeofenceState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notify() {
    this.listeners.forEach((listener) => listener(this.state));
  }

  update(partialState: Partial<GeofenceState>) {
    this.state = {
      ...this.state,
      ...partialState,
    };
    this.notify();
  }

  setCollection(collection: GeofenceCollection) {
    this.state = {
      ...this.state,
      collection,
    };
    this.notify();
  }

  resetDrawing() {
    this.state = {
      ...this.state,
      drawing: {
        vertices: [],
        preview: null,
        activeZoneType: this.state.drawing.activeZoneType,
        activeGeometryType: this.state.drawing.activeGeometryType || "POLYGON",
      },
    };
    this.notify();
  }
}

export const geofenceStore = new GeofenceStore();
