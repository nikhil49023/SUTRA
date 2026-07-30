import React, { useEffect } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Waypoint } from '../../../types';

interface MissionPathRendererProps {
  map: maplibregl.Map | null;
  waypoints: Waypoint[];
  activeWaypointIdx?: number;
}

export const MissionPathRenderer: React.FC<MissionPathRendererProps> = ({
  map,
  waypoints,
  activeWaypointIdx = 0
}) => {
  useEffect(() => {
    if (!map) return;

    const sourceRemainingId = 'mission-route-remaining-source';
    const layerRemainingId = 'mission-route-remaining-layer';
    const sourceCompletedId = 'mission-route-completed-source';
    const layerCompletedId = 'mission-route-completed-layer';

    const allCoordinates = waypoints.map((wp) => [wp.lng, wp.lat]);
    const completedCoordinates = allCoordinates.slice(0, Math.max(1, activeWaypointIdx + 1));
    const remainingCoordinates = allCoordinates.slice(Math.max(0, activeWaypointIdx));

    const completedGeoJSON: GeoJSON.Feature<GeoJSON.LineString> = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: completedCoordinates.length > 1 ? completedCoordinates : [] }
    };

    const remainingGeoJSON: GeoJSON.Feature<GeoJSON.LineString> = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: remainingCoordinates.length > 1 ? remainingCoordinates : [] }
    };

    const addOrUpdateLayers = () => {
      // Remaining route (Dashed Yellow)
      if (map.getSource(sourceRemainingId)) {
        (map.getSource(sourceRemainingId) as maplibregl.GeoJSONSource).setData(remainingGeoJSON);
      } else {
        map.addSource(sourceRemainingId, { type: 'geojson', data: remainingGeoJSON });
        map.addLayer({
          id: layerRemainingId,
          type: 'line',
          source: sourceRemainingId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#ffb700', 'line-width': 2.5, 'line-dasharray': [3, 2] }
        });
      }

      // Completed route (Solid Cyan)
      if (map.getSource(sourceCompletedId)) {
        (map.getSource(sourceCompletedId) as maplibregl.GeoJSONSource).setData(completedGeoJSON);
      } else {
        map.addSource(sourceCompletedId, { type: 'geojson', data: completedGeoJSON });
        map.addLayer({
          id: layerCompletedId,
          type: 'line',
          source: sourceCompletedId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#00f0ff', 'line-width': 3.5 }
        });
      }
    };

    if (map.isStyleLoaded()) {
      addOrUpdateLayers();
    } else {
      map.once('load', addOrUpdateLayers);
    }
  }, [map, waypoints, activeWaypointIdx]);

  return null;
};
