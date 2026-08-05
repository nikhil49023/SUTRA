// Geofence Renderer Component
import { useEffect } from "react";
import type { FeatureCollection, Polygon } from "geojson";
import { Map as MapLibreMap, Marker } from "maplibre-gl";

import { geofenceStore } from "../store/GeofenceStore";
import { SourceManager } from "../render/SourceManager";
import { LayerManager } from "../render/LayerManager";
import { markerManager } from "../render/MarkerManager";
import { labelManager } from "../render/LabelManager";
import { useDrawing } from "../hooks/useDrawing";
import { useEditing } from "../hooks/useEditing";

interface Props {
  map: MapLibreMap | null;
}

export default function GeofenceRenderer({ map }: Props) {
  useDrawing({ map });
  useEditing({ map });

  useEffect(() => {
    if (!map) return;

    const init = () => {
      SourceManager.initialize(map);
      LayerManager.initialize(map);
    };

    if (map.isStyleLoaded()) {
      init();
    } else {
      map.once("load", init);
    }

    return () => {
      if (!map) return;
      LayerManager.destroy(map);
      markerManager.clearAll();
      labelManager.clear();
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;

    const unsubscribe = geofenceStore.subscribe((state) => {
      // 1. RENDER COMPLETED GEOFENCE POLYGONS
      const polygonCollection: FeatureCollection<Polygon> = {
        type: "FeatureCollection",
        features: state.collection.features.map((feature) => ({
          ...feature,
          properties: {
            ...feature.properties,
            fillColor:
              feature.properties.type === "NO_FLY"
                ? "rgba(239, 68, 68, 0.35)"
                : feature.properties.type === "WARNING"
                ? "rgba(245, 158, 11, 0.35)"
                : "rgba(16, 185, 129, 0.35)",
            outlineColor: feature.properties.color,
          },
        })),
      };

      SourceManager.updateGeofences(map, polygonCollection);

      // 2. RENDER LIVE PREVIEW POLYGON & LINE CONNECTING DRAINED VERTICES
      const previewFeatures: any[] = [];
      const vertices = state.drawing.vertices;
      const previewPoint = state.drawing.preview;

      // Include active mouse cursor position if currently drawing
      const currentPoints = previewPoint ? [...vertices, previewPoint] : [...vertices];

      // Draw line string between all placed dots
      if (currentPoints.length >= 2) {
        previewFeatures.push({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: currentPoints,
          },
          properties: {},
        });
      }

      // Draw active dynamic polygon connecting from start dot to current dot
      if (currentPoints.length >= 3) {
        const closedPolygon = [...currentPoints];
        const first = closedPolygon[0];
        const last = closedPolygon[closedPolygon.length - 1];

        if (first[0] !== last[0] || first[1] !== last[1]) {
          closedPolygon.push([...first]);
        }

        previewFeatures.push({
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [closedPolygon],
          },
          properties: {},
        });
      }

      SourceManager.updatePreview(map, {
        type: "FeatureCollection",
        features: previewFeatures,
      });

      // 3. RENDER DRAWING VERTEX DOTS & ALL GEOFENCE CORNER NODES
      markerManager.renderDrawingMarkers(
        map,
        state.drawing.vertices as [number, number][]
      );
      markerManager.renderAllGeofenceVertexMarkers(map, state.collection.features);

      // 4. RENDER LABELS FOR COMPLETED ZONES
      labelManager.render(map, state.collection.features);
    });

    return unsubscribe;
  }, [map]);

  // Render Live Drone Flight Path & Animated Quadcopter Marker
  useEffect(() => {
    if (!map) return;

    const routeCoords: [number, number][] = [
      [45.108, 34.531],
      [45.114, 34.528],
      [45.122, 34.526]
    ];

    if (!map.getSource("mission-route-source")) {
      map.addSource("mission-route-source", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: routeCoords
          },
          properties: {}
        }
      });
    }

    if (!map.getLayer("mission-route-casing")) {
      map.addLayer({
        id: "mission-route-casing",
        type: "line",
        source: "mission-route-source",
        paint: {
          "line-color": "#050914",
          "line-width": 5,
          "line-opacity": 0.9
        }
      });
    }

    if (!map.getLayer("mission-route-layer")) {
      map.addLayer({
        id: "mission-route-layer",
        type: "line",
        source: "mission-route-source",
        paint: {
          "line-color": "#22c55e",
          "line-width": 2.5,
          "line-dasharray": [4, 4]
        }
      });
    }

    const droneEl = document.createElement("div");
    droneEl.className = "w-7 h-7 rounded-full flex items-center justify-center bg-[#070d1a]/90 border border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.6)] backdrop-blur-md pointer-events-none";
    droneEl.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2">
        <circle cx="12" cy="12" r="3" fill="#ffffff" />
        <line x1="4" y1="4" x2="20" y2="20" stroke="#06b6d4" stroke-width="1.5" />
        <line x1="20" y1="4" x2="4" y2="20" stroke="#06b6d4" stroke-width="1.5" />
        <circle cx="4" cy="4" r="2.5" stroke="#22c55e" stroke-width="1.5" />
        <circle cx="20" cy="4" r="2.5" stroke="#22c55e" stroke-width="1.5" />
        <circle cx="4" cy="20" r="2.5" stroke="#22c55e" stroke-width="1.5" />
        <circle cx="20" cy="20" r="2.5" stroke="#22c55e" stroke-width="1.5" />
      </svg>
    `;

    const droneMarker = new Marker({ element: droneEl })
      .setLngLat(routeCoords[0])
      .addTo(map);

    let progress = 0;
    let forward = true;

    const interval = setInterval(() => {
      progress += forward ? 0.006 : -0.006;
      if (progress >= 1) forward = false;
      if (progress <= 0) forward = true;

      const p1 = routeCoords[0];
      const p2 = routeCoords[2];
      const curLng = p1[0] + (p2[0] - p1[0]) * progress;
      const curLat = p1[1] + (p2[1] - p1[1]) * progress;

      droneMarker.setLngLat([curLng, curLat]);
    }, 50);

    return () => {
      clearInterval(interval);
      droneMarker.remove();
      if (map.getLayer("mission-route-layer")) map.removeLayer("mission-route-layer");
      if (map.getLayer("mission-route-casing")) map.removeLayer("mission-route-casing");
      if (map.getSource("mission-route-source")) map.removeSource("mission-route-source");
    };
  }, [map]);

  return null;
}
