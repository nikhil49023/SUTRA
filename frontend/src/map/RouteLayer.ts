/**
 * Smart Horizon GCS — Tactical Mission Route Polyline & Progress Layer
 */

import maplibregl from 'maplibre-gl';
import { Waypoint } from '../types/mission';

export class RouteLayer {
  private map: maplibregl.Map | null = null;
  private sourceId = 'mission-route-source';
  private lineLayerId = 'mission-route-line';
  private dashLayerId = 'mission-route-dash';
  private lastWaypoints: Waypoint[] = [];
  private lastHomeLat?: number;
  private lastHomeLon?: number;

  public setMap(map: maplibregl.Map | null): void {
    this.map = map;
    if (!map) return;

    if (map.isStyleLoaded()) {
      this.initLayers();
    } else {
      map.once('load', () => this.initLayers());
    }

    map.on('style.load', () => {
      this.initLayers();
      if (this.lastWaypoints.length > 0) {
        this.updateRoute(this.lastWaypoints, this.lastHomeLat, this.lastHomeLon);
      }
    });
  }

  public initLayers(): void {
    if (!this.map || !this.map.isStyleLoaded() || this.map.getSource(this.sourceId)) return;

    try {
      this.map.addSource(this.sourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      // Base glowing path
      this.map.addLayer({
        id: this.lineLayerId,
        type: 'line',
        source: this.sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#5B8FB9',
          'line-width': 2.5,
          'line-opacity': 0.85,
        },
      });

      // Animated dashed overlay
      this.map.addLayer({
        id: this.dashLayerId,
        type: 'line',
        source: this.sourceId,
        paint: {
          'line-color': '#E7EBEF',
          'line-width': 1.2,
          'line-dasharray': [2, 4],
          'line-opacity': 0.75,
        },
      });
    } catch (e) {
      console.warn('RouteLayer initLayers error:', e);
    }
  }

  public updateRoute(waypoints: Waypoint[], homeLat?: number, homeLon?: number): void {
    this.lastWaypoints = waypoints;
    this.lastHomeLat = homeLat;
    this.lastHomeLon = homeLon;

    if (!this.map || !this.map.isStyleLoaded()) return;
    this.initLayers();

    const coordinates: [number, number][] = [];
    if (homeLat !== undefined && homeLon !== undefined) {
      coordinates.push([homeLon, homeLat]);
    }

    waypoints.forEach((wp) => {
      coordinates.push([wp.longitude, wp.latitude]);
    });

    const source = this.map.getSource(this.sourceId) as maplibregl.GeoJSONSource;
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features:
          coordinates.length >= 2
            ? [
                {
                  type: 'Feature',
                  geometry: {
                    type: 'LineString',
                    coordinates,
                  },
                  properties: {},
                },
              ]
            : [],
      });
    }
  }
}
