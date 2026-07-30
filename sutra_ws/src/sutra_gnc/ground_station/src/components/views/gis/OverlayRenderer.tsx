import React, { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { AIDetection } from '../../../types';

interface OverlayRendererProps {
  map: maplibregl.Map | null;
  geofences: [number, number][][];
  drawingPoints?: [number, number][];
  aiDetections: AIDetection[];
  showGeofence: boolean;
  onUpdateGeofenceVertex?: (polygonIdx: number, vertexIdx: number, newLngLat: [number, number]) => void;
}

export const OverlayRenderer: React.FC<OverlayRendererProps> = ({
  map,
  geofences,
  drawingPoints = [],
  aiDetections,
  showGeofence,
  onUpdateGeofenceVertex
}) => {
  const vertexMarkersRef = useRef<maplibregl.Marker[]>([]);
  const drawingMarkersRef = useRef<maplibregl.Marker[]>([]);
  const isDraggingVertexRef = useRef<boolean>(false);

  useEffect(() => {
    if (!map) return;

    const sourceId = 'geofence-polygons-source';
    const fillLayerId = 'geofence-polygons-fill';
    const lineLayerId = 'geofence-polygons-line';
    const previewSourceId = 'geofence-preview-source';
    const previewLineLayerId = 'geofence-preview-line-layer';
    const previewFillLayerId = 'geofence-preview-fill-layer';

    // Clear existing markers
    vertexMarkersRef.current.forEach((m) => m.remove());
    vertexMarkersRef.current = [];

    drawingMarkersRef.current.forEach((m) => m.remove());
    drawingMarkersRef.current = [];

    const emptyGeoJSON: GeoJSON.FeatureCollection<GeoJSON.Polygon> = {
      type: 'FeatureCollection',
      features: []
    };

    if (!showGeofence) {
      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(emptyGeoJSON);
      }
      return;
    }

    // 1. Render vertex markers and closed polygons for existing geofences
    const polygonFeatures: GeoJSON.Feature<GeoJSON.Polygon>[] = geofences.map((poly, polyIdx) => {
      const ring = poly.map(([lat, lng]) => [lng, lat] as [number, number]);
      if (ring.length > 0 && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
        ring.push([ring[0][0], ring[0][1]]);
      }

      if (onUpdateGeofenceVertex) {
        poly.forEach(([lat, lng], vIdx) => {
          const el = document.createElement('div');
          el.className = 'vertex-handle w-3.5 h-3.5 bg-rose-500 border-2 border-white rounded-full cursor-grab active:cursor-grabbing shadow-[0_0_8px_#ff3b30] select-none';

          const marker = new maplibregl.Marker({ element: el, draggable: true })
            .setLngLat([lng, lat])
            .addTo(map);

          marker.on('dragstart', () => {
            isDraggingVertexRef.current = true;
            map.dragPan.disable();
          });

          marker.on('dragend', () => {
            map.dragPan.enable();
            isDraggingVertexRef.current = false;
            const newPos = marker.getLngLat();
            onUpdateGeofenceVertex(polyIdx, vIdx, [+newPos.lat.toFixed(5), +newPos.lng.toFixed(5)]);
          });

          vertexMarkersRef.current.push(marker);
        });
      }

      return {
        type: 'Feature',
        properties: { name: 'RESTRICTED AIRSPACE' },
        geometry: { type: 'Polygon', coordinates: [ring] }
      };
    });

    // 2. Render visible red dot markers for active drawing points
    drawingPoints.forEach(([lat, lng], idx) => {
      const el = document.createElement('div');
      el.className = 'drawing-point-marker relative flex items-center justify-center';
      el.innerHTML = `
        <div class="w-4 h-4 rounded-full bg-rose-500 border-2 border-white shadow-[0_0_10px_#ff3b30] flex items-center justify-center text-[9px] font-mono text-white font-bold">
          ${idx + 1}
        </div>
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);

      drawingMarkersRef.current.push(marker);
    });

    const geojson: GeoJSON.FeatureCollection<GeoJSON.Polygon> = {
      type: 'FeatureCollection',
      features: polygonFeatures
    };

    // 3. Geofence Drawing Preview (both Line & Red Shaded Polygon Fill if >= 3 points)
    const previewRing = drawingPoints.map(([lat, lng]) => [lng, lat] as [number, number]);
    if (previewRing.length >= 3 && (previewRing[0][0] !== previewRing[previewRing.length - 1][0] || previewRing[0][1] !== previewRing[previewRing.length - 1][1])) {
      previewRing.push([previewRing[0][0], previewRing[0][1]]);
    }

    const previewPolygonGeoJSON: GeoJSON.FeatureCollection<GeoJSON.Polygon> = {
      type: 'FeatureCollection',
      features: previewRing.length >= 4 ? [
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: [previewRing] }
        }
      ] : []
    };

    const updateOverlays = () => {
      // Completed Geofences (Rich Red Shaded Fill)
      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson);
      } else {
        map.addSource(sourceId, { type: 'geojson', data: geojson });
        map.addLayer({
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': '#ff3b30',
            'fill-opacity': 0.4
          }
        });
        map.addLayer({
          id: lineLayerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#ff3b30',
            'line-width': 3,
            'line-dasharray': [2, 2]
          }
        });
      }

      // Drawing Preview Red Shaded Fill & Border Line
      if (map.getSource(previewSourceId)) {
        (map.getSource(previewSourceId) as maplibregl.GeoJSONSource).setData(previewPolygonGeoJSON);
      } else {
        map.addSource(previewSourceId, { type: 'geojson', data: previewPolygonGeoJSON });
        map.addLayer({
          id: previewFillLayerId,
          type: 'fill',
          source: previewSourceId,
          paint: {
            'fill-color': '#ff3b30',
            'fill-opacity': 0.35
          }
        });
        map.addLayer({
          id: previewLineLayerId,
          type: 'line',
          source: previewSourceId,
          paint: {
            'line-color': '#ff3b30',
            'line-width': 3,
            'line-dasharray': [3, 3]
          }
        });
      }
    };

    if (map.isStyleLoaded()) {
      updateOverlays();
    } else {
      map.once('load', updateOverlays);
    }

    return () => {
      vertexMarkersRef.current.forEach((m) => m.remove());
      vertexMarkersRef.current = [];
      drawingMarkersRef.current.forEach((m) => m.remove());
      drawingMarkersRef.current = [];
    };
  }, [map, geofences, drawingPoints, showGeofence, onUpdateGeofenceVertex]);

  return null;
};
