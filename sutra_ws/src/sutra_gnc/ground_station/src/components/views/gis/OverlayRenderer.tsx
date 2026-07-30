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
  const isDraggingVertexRef = useRef<boolean>(false);

  useEffect(() => {
    if (!map || !showGeofence) return;

    // Remove existing vertex markers
    vertexMarkersRef.current.forEach((m) => m.remove());
    vertexMarkersRef.current = [];

    const sourceId = 'geofence-polygons-source';
    const fillLayerId = 'geofence-polygons-fill';
    const lineLayerId = 'geofence-polygons-line';
    const previewSourceId = 'geofence-preview-source';
    const previewLayerId = 'geofence-preview-layer';

    const polygonFeatures: GeoJSON.Feature<GeoJSON.Polygon>[] = geofences.map((poly, polyIdx) => {
      const ring = poly.map(([lat, lng]) => [lng, lat] as [number, number]);
      if (ring.length > 0 && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
        ring.push([ring[0][0], ring[0][1]]);
      }

      // Add draggable vertex handles for geofences
      if (onUpdateGeofenceVertex) {
        poly.forEach(([lat, lng], vIdx) => {
          const el = document.createElement('div');
          el.className = 'vertex-handle w-3.5 h-3.5 bg-rose-500 border-2 border-white rounded-full cursor-grab active:cursor-grabbing shadow-lg select-none';

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

    const geojson: GeoJSON.FeatureCollection<GeoJSON.Polygon> = {
      type: 'FeatureCollection',
      features: polygonFeatures
    };

    // Geofence drawing preview line
    const previewGeoJSON: GeoJSON.Feature<GeoJSON.LineString> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: drawingPoints.map(([lat, lng]) => [lng, lat])
      }
    };

    const updateOverlays = () => {
      // Completed Geofences
      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson);
      } else {
        map.addSource(sourceId, { type: 'geojson', data: geojson });
        map.addLayer({
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          paint: { 'fill-color': '#ff3b30', 'fill-opacity': 0.15 }
        });
        map.addLayer({
          id: lineLayerId,
          type: 'line',
          source: sourceId,
          paint: { 'line-color': '#ff3b30', 'line-width': 2, 'line-dasharray': [2, 2] }
        });
      }

      // Drawing Preview Line
      if (map.getSource(previewSourceId)) {
        (map.getSource(previewSourceId) as maplibregl.GeoJSONSource).setData(previewGeoJSON);
      } else {
        map.addSource(previewSourceId, { type: 'geojson', data: previewGeoJSON });
        map.addLayer({
          id: previewLayerId,
          type: 'line',
          source: previewSourceId,
          paint: { 'line-color': '#ff3b30', 'line-width': 2, 'line-dasharray': [3, 3] }
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
    };
  }, [map, geofences, drawingPoints, showGeofence, onUpdateGeofenceVertex]);

  return null;
};
