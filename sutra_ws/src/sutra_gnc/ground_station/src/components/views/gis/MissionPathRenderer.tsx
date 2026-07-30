import React, { useEffect } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Waypoint } from '../../../types';

interface MissionPathRendererProps {
  map: maplibregl.Map | null;
  waypoints: Waypoint[];
}

export const MissionPathRenderer: React.FC<MissionPathRendererProps> = ({ map, waypoints }) => {
  useEffect(() => {
    if (!map) return;

    const sourceId = 'mission-route-source';
    const layerId = 'mission-route-layer';

    const coordinates = waypoints.map((wp) => [wp.lng, wp.lat]);

    const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates
      }
    };

    const addOrUpdateLayer = () => {
      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson);
      } else {
        map.addSource(sourceId, {
          type: 'geojson',
          data: geojson
        });

        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#00f0ff',
            'line-width': 3,
            'line-dasharray': [2, 2]
          }
        });
      }
    };

    if (map.isStyleLoaded()) {
      addOrUpdateLayer();
    } else {
      map.once('load', addOrUpdateLayer);
    }
  }, [map, waypoints]);

  return null;
};
