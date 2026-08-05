// Layer Manager
import type { Map as MapLibreMap } from "maplibre-gl";
import { GEOFENCE_SOURCE_ID, PREVIEW_SOURCE_ID } from "./SourceManager";

export const FILL_LAYER_ID = "geofence-fill";
export const OUTLINE_CASING_LAYER_ID = "geofence-outline-casing";
export const OUTLINE_LAYER_ID = "geofence-outline";
export const PREVIEW_LINE_CASING_LAYER_ID = "geofence-preview-line-casing";
export const PREVIEW_LINE_LAYER_ID = "geofence-preview-line";
export const PREVIEW_FILL_LAYER_ID = "geofence-preview-fill";

export class LayerManager {
  static initialize(map: MapLibreMap) {
    const layers = map.getStyle().layers;
    const beforeId = layers?.find((l) => l.type === "symbol")?.id;

    if (!map.getLayer(FILL_LAYER_ID)) {
      map.addLayer(
        {
          id: FILL_LAYER_ID,
          type: "fill",
          source: GEOFENCE_SOURCE_ID,
          paint: {
            "fill-color": ["get", "fillColor"],
            "fill-opacity": 0.35,
          },
        },
        beforeId
      );
    }

    if (!map.getLayer(OUTLINE_CASING_LAYER_ID)) {
      map.addLayer(
        {
          id: OUTLINE_CASING_LAYER_ID,
          type: "line",
          source: GEOFENCE_SOURCE_ID,
          paint: {
            "line-color": "#050914",
            "line-width": 4.5,
            "line-opacity": 0.85,
          },
        },
        beforeId
      );
    }

    if (!map.getLayer(OUTLINE_LAYER_ID)) {
      map.addLayer(
        {
          id: OUTLINE_LAYER_ID,
          type: "line",
          source: GEOFENCE_SOURCE_ID,
          paint: {
            "line-color": ["get", "outlineColor"],
            "line-width": 2.2,
            "line-dasharray": [
              "case",
              ["==", ["get", "type"], "WARNING"],
              ["literal", [4, 4]],
              ["literal", [1, 0]]
            ],
          },
        },
        beforeId
      );
    }

    if (!map.getLayer(PREVIEW_FILL_LAYER_ID)) {
      map.addLayer({
        id: PREVIEW_FILL_LAYER_ID,
        type: "fill",
        source: PREVIEW_SOURCE_ID,
        filter: ["==", "$type", "Polygon"],
        paint: {
          "fill-color": "rgba(0, 240, 255, 0.25)",
        },
      });
    }

    if (!map.getLayer(PREVIEW_LINE_CASING_LAYER_ID)) {
      map.addLayer({
        id: PREVIEW_LINE_CASING_LAYER_ID,
        type: "line",
        source: PREVIEW_SOURCE_ID,
        paint: {
          "line-color": "#000000",
          "line-width": 5,
          "line-opacity": 0.9,
        },
      });
    }

    if (!map.getLayer(PREVIEW_LINE_LAYER_ID)) {
      map.addLayer({
        id: PREVIEW_LINE_LAYER_ID,
        type: "line",
        source: PREVIEW_SOURCE_ID,
        paint: {
          "line-color": "#00f0ff",
          "line-width": 2.5,
          "line-dasharray": [4, 4],
        },
      });
    }
  }

  static destroy(map: MapLibreMap) {
    [
      PREVIEW_LINE_LAYER_ID,
      PREVIEW_LINE_CASING_LAYER_ID,
      PREVIEW_FILL_LAYER_ID,
      OUTLINE_LAYER_ID,
      OUTLINE_CASING_LAYER_ID,
      FILL_LAYER_ID
    ].forEach((layerId) => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
    });
  }
}
