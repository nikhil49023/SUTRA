/**
 * Smart Horizon GCS — Tactical GIS Overlays: LOS Rays, RF Heatmap & Search Grids
 */

import maplibregl from 'maplibre-gl';
import { GISState, LOSVector } from '../types/gis';

export class GisLayer {
  private map: maplibregl.Map | null = null;
  private losSourceId = 'gis-los-source';
  private losLineLayerId = 'gis-los-line';
  private searchSourceId = 'gis-search-source';
  private searchLineLayerId = 'gis-search-line';
  private lastGisState: GISState | null = null;

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
      if (this.lastGisState) {
        this.updateGis(this.lastGisState);
      }
    });
  }

  public initLayers(): void {
    if (!this.map || !this.map.isStyleLoaded() || this.map.getSource(this.losSourceId)) return;

    try {
      // LOS Vectors Source
      this.map.addSource(this.losSourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      this.map.addLayer({
        id: this.losLineLayerId,
        type: 'line',
        source: this.losSourceId,
        paint: {
          'line-color': ['case', ['get', 'visible'], '#4F9A72', '#C75A5A'],
          'line-width': 2.0,
          'line-dasharray': [3, 2],
        },
      });

      // Search Grid Source
      this.map.addSource(this.searchSourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      this.map.addLayer({
        id: this.searchLineLayerId,
        type: 'line',
        source: this.searchSourceId,
        paint: {
          'line-color': '#5B8FB9',
          'line-width': 1.5,
          'line-opacity': 0.75,
        },
      });
    } catch (e) {
      console.warn('GisLayer initLayers error:', e);
    }
  }

  public updateGis(gisState: GISState): void {
    this.lastGisState = gisState;

    if (!this.map || !this.map.isStyleLoaded()) return;
    this.initLayers();

    // Render LOS
    const losSource = this.map.getSource(this.losSourceId) as maplibregl.GeoJSONSource;
    if (losSource) {
      const features = (gisState.los_vectors || []).map((ray: LOSVector) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [ray.target_lon, ray.target_lat],
            [ray.obs_lon, ray.obs_lat],
          ],
        },
        properties: {
          visible: ray.visible,
        },
      }));

      losSource.setData({
        type: 'FeatureCollection',
        features,
      });
    }

    // Render Search Path
    const searchSource = this.map.getSource(this.searchSourceId) as maplibregl.GeoJSONSource;
    if (searchSource && gisState.search_path_points && gisState.search_path_points.length >= 2) {
      searchSource.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature' as const,
            geometry: {
              type: 'LineString' as const,
              coordinates: gisState.search_path_points.map((p) => [p[1], p[0]]),
            },
            properties: {},
          },
        ],
      });
    }
  }
}
