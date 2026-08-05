// Geofence Controller
import { Position } from "geojson";
import { geofenceStore } from "../store/GeofenceStore";
import { InteractionMode, ZoneType } from "../types/GeofenceTypes";
import { GeofenceService } from "../services/GeofenceService";

export class GeofenceController {

    /**
     * Start drawing a new geofence.
     */
    static startDrawing(zoneType: ZoneType = ZoneType.NO_FLY, geometryType: any = "POLYGON") {
        const state = geofenceStore.getState();
        geofenceStore.update({
            interactionMode: InteractionMode.DRAW,
            drawing: {
                vertices: [],
                preview: null,
                activeZoneType: zoneType,
                activeGeometryType: geometryType,
            },
            selection: {
                selectedGeofenceId: null,
                selectedVertexIndex: null,
            }
        });
    }

    /**
     * Cancel drawing.
     */
    static cancelDrawing() {
        geofenceStore.resetDrawing();
        geofenceStore.update({
            interactionMode: InteractionMode.IDLE
        });
    }

    /**
     * Add vertex.
     */
    static addVertex(vertex: Position) {
        const state = geofenceStore.getState();
        const geometryType = state.drawing.activeGeometryType || "POLYGON";

        const newVertices = [...state.drawing.vertices, vertex];

        geofenceStore.update({
            drawing: {
                ...state.drawing,
                vertices: newVertices
            }
        });

        // Auto-finish single-click Circle or 2-click Corridor if applicable
        if (geometryType === "CIRCLE" && newVertices.length >= 1) {
            this.finishDrawing();
        } else if (geometryType === "CORRIDOR" && newVertices.length >= 2) {
            this.finishDrawing();
        }
    }

    /**
     * Update preview.
     */
    static updatePreview(vertex: Position) {
        const state = geofenceStore.getState();
        geofenceStore.update({
            drawing: {
                ...state.drawing,
                preview: vertex
            }
        });
    }

    /**
     * Undo last point.
     */
    static undoVertex() {
        const state = geofenceStore.getState();
        const vertices = [...state.drawing.vertices];
        vertices.pop();
        geofenceStore.update({
            drawing: {
                ...state.drawing,
                vertices
            }
        });
    }

    /**
     * Finish polygon / circle / corridor.
     */
    static finishDrawing() {
        const state = geofenceStore.getState();
        const geometryType = state.drawing.activeGeometryType || "POLYGON";
        const vCount = state.drawing.vertices.length;

        if (geometryType === "POLYGON" && vCount < 3) return;
        if (geometryType === "CIRCLE" && vCount < 1) return;
        if (geometryType === "CORRIDOR" && vCount < 2) return;

        const defaultName =
            geometryType === "CIRCLE"
                ? `Warning Circle ${state.collection.features.length + 1}`
                : geometryType === "CORRIDOR"
                ? `Flight Corridor ${state.collection.features.length + 1}`
                : `${state.drawing.activeZoneType === "NO_FLY" ? "No Fly Zone" : state.drawing.activeZoneType === "WARNING" ? "Warning Zone" : "Safe Zone"} ${state.collection.features.length + 1}`;

        const zoneType = geometryType === "CORRIDOR" ? ZoneType.CORRIDOR : state.drawing.activeZoneType;

        GeofenceService.createGeofence(
            defaultName,
            zoneType,
            state.drawing.vertices,
            geometryType,
            500, // default 500m radius
            200  // default 200m corridor width
        );

        geofenceStore.resetDrawing();
        geofenceStore.update({
            interactionMode: InteractionMode.IDLE
        });
    }

    /**
     * Select geofence.
     */
    static selectGeofence(id: string | null) {

        const state = geofenceStore.getState();

        geofenceStore.update({

            interactionMode:
                id
                    ? InteractionMode.SELECT
                    : InteractionMode.IDLE,

            selection: {

                ...state.selection,

                selectedGeofenceId: id,

                selectedVertexIndex: null

            }

        });

    }

    /**
     * Select vertex.
     */
    static selectVertex(index: number | null) {

        const state = geofenceStore.getState();

        geofenceStore.update({

            interactionMode:
                index !== null
                    ? InteractionMode.DRAG_VERTEX
                    : InteractionMode.SELECT,

            selection: {

                ...state.selection,

                selectedVertexIndex: index

            }

        });

    }

    /**
     * Move vertex.
     */
    static moveVertex(vertex: Position) {

        const state = geofenceStore.getState();

        if (
            state.selection.selectedGeofenceId === null ||
            state.selection.selectedVertexIndex === null
        ) return;

        const feature = GeofenceService.getById(
            state.selection.selectedGeofenceId
        );

        if (!feature) return;

        const vertices = feature.geometry.coordinates[0]
            .slice(0, -1);

        vertices[state.selection.selectedVertexIndex] = vertex;

        GeofenceService.updateVertices(
            feature.properties.id,
            vertices
        );
    }

    /**
     * Set interaction mode.
     */
    static setInteractionMode(mode: InteractionMode) {
        geofenceStore.update({
            interactionMode: mode
        });
    }

    /**
     * Delete geofence by ID.
     */
    static deleteGeofence(id: string) {
        GeofenceService.delete(id);
        const state = geofenceStore.getState();
        if (state.selection.selectedGeofenceId === id) {
            this.selectGeofence(null);
        }
    }

    /**
     * Clear all geofences.
     */
    static clearAllGeofences() {
        geofenceStore.setCollection({
            type: "FeatureCollection",
            features: []
        });
        this.selectGeofence(null);
        this.cancelDrawing();
    }

    /**
     * Undo last point alias.
     */
    static undoLastPoint() {
        this.undoVertex();
    }
}