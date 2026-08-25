/**
 * Smart Horizon GCS — Tactical GIS Overlays: LOS Rays, RF Heatmap & Search Grids
 */

import maplibregl from 'maplibre-gl';
import { GISState } from '../types/gis';

export class GisLayer {
  private map: maplibregl.Map | null = null;
  private losSourceId = 'gis-los-source';
  private losLineLayerId = 'gis-los-line';
  private searchSourceId = 'gis-search-source';
  private searchLineLayerId = 'gis-search-line';

  public setMap(map: maplibregl.Map | null): void {
    this.map = map;
    if (map && map.isStyleLoaded()) {
      this.initLayers();
    }
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

  public updateGis(gis: GISState): void {
    if (!this.map || !this.map.isStyleLoaded()) return;
    this.initLayers();

    // LOS update
    const losFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = gis.los_enabled
      ? gis.los_vectors.map((v) => ({
          type: 'Feature' as const,
          properties: { visible: v.visible },
          geometry: {
            type: 'LineString' as const,
            coordinates: [
              [v.obs_lon, v.obs_lat],
              [v.target_lon, v.target_lat],
            ],
          },
        }))
      : [];

    const losSource = this.map.getSource(this.losSourceId) as maplibregl.GeoJSONSource;
    if (losSource) losSource.setData({ type: 'FeatureCollection', features: losFeatures });

    // Search path update
    const searchFeatures: GeoJSON.Feature<GeoJSON.LineString>[] =
      gis.grid_enabled && gis.search_path_points.length >= 2
        ? [
            {
              type: 'Feature' as const,
              properties: {},
              geometry: {
                type: 'LineString' as const,
                coordinates: gis.search_path_points.map((p) => [p[1], p[0]]),
              },
            },
          ]
        : [];

    const searchSource = this.map.getSource(this.searchSourceId) as maplibregl.GeoJSONSource;
    if (searchSource) searchSource.setData({ type: 'FeatureCollection', features: searchFeatures });
  }
}
