// Source Manager
import type { FeatureCollection, Polygon } from "geojson";
import type { Map, GeoJSONSource } from "maplibre-gl";

export const GEOFENCE_SOURCE_ID = "geofence-source";
export const GEOFENCE_PREVIEW_SOURCE_ID = "geofence-preview-source";
export const PREVIEW_SOURCE_ID = GEOFENCE_PREVIEW_SOURCE_ID;

export class SourceManager {
    /**
     * Create GeoJSON sources if they don't exist.
     */
    static initialize(map: Map) {
        if (!map.getSource(GEOFENCE_SOURCE_ID)) {
            map.addSource(GEOFENCE_SOURCE_ID, {
                type: "geojson",
                data: {
                    type: "FeatureCollection",
                    features: [],
                },
            });
        }

        if (!map.getSource(GEOFENCE_PREVIEW_SOURCE_ID)) {
            map.addSource(GEOFENCE_PREVIEW_SOURCE_ID, {
                type: "geojson",
                data: {
                    type: "FeatureCollection",
                    features: [],
                },
            });
        }
    }

    /**
     * Update completed geofences.
     */
    static updateGeofences(
        map: Map,
        collection: FeatureCollection<Polygon>
    ) {
        const source = map.getSource(
            GEOFENCE_SOURCE_ID
        ) as GeoJSONSource;

        if (!source) return;

        source.setData(collection);
    }

    /**
     * Update preview polygon.
     */
    static updatePreview(
        map: Map,
        collection: FeatureCollection
    ) {
        const source = map.getSource(
            GEOFENCE_PREVIEW_SOURCE_ID
        ) as GeoJSONSource;

        if (!source) return;

        source.setData(collection);
    }

    /**
     * Clear preview.
     */
    static clearPreview(map: Map) {
        this.updatePreview(map, {
            type: "FeatureCollection",
            features: [],
        });
    }
}