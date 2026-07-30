import React, { useEffect } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { AIDetection } from '../../../types';

interface OverlayRendererProps {
  map: maplibregl.Map | null;
  geofences: [number, number][][];
  aiDetections: AIDetection[];
  showGeofence: boolean;
}

export const OverlayRenderer: React.FC<OverlayRendererProps> = ({ map, geofences, aiDetections, showGeofence }) => {
  useEffect(() => {
    if (!map || !showGeofence) return;

    const sourceId = 'geofence-polygons-source';
    const fillLayerId = 'geofence-polygons-fill';
    const lineLayerId = 'geofence-polygons-line';

    const polygonFeatures: GeoJSON.Feature<GeoJSON.Polygon>[] = geofences.map((poly) => {
      const ring = poly.map(([lat, lng]) => [lng, lat] as [number, number]);
      if (ring.length > 0 && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
        ring.push([ring[0][0], ring[0][1]]);
      }
      return {
        type: 'Feature',
        properties: { name: 'RESTRICTED AIRSPACE ALPHA' },
        geometry: {
          type: 'Polygon',
          coordinates: [ring]
        }
      };
    });

    const geojson: GeoJSON.FeatureCollection<GeoJSON.Polygon> = {
      type: 'FeatureCollection',
      features: polygonFeatures
    };

    const updateOverlays = () => {
      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson);
      } else {
        map.addSource(sourceId, {
          type: 'geojson',
          data: geojson
        });

        map.addLayer({
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': '#ff3b30',
            'fill-opacity': 0.15
          }
        });

        map.addLayer({
          id: lineLayerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#ff3b30',
            'line-width': 2,
            'line-dasharray': [2, 2]
          }
        });
      }
    };

    if (map.isStyleLoaded()) {
      updateOverlays();
    } else {
      map.once('load', updateOverlays);
    }
  }, [map, geofences, showGeofence]);

  return null;
};
