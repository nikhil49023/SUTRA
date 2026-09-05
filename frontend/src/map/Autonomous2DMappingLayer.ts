/**
 * Smart Horizon GCS — Real-Time 2D Autonomous Mapping Layer (MapLibre GL)
 * Subsystem: 2D World Model Visualization (Subsystem D)
 * 
 * Renders the incremental 2D occupancy & semantic grid world model:
 * - Bayesian Free Space Exploration Footprint
 * - Obstacles & Structural Barriers (Red/Orange)
 * - Buildings & Collapsed Infrastructure (Indigo)
 * - Roads & Evacuation Corridors (Amber)
 * - Water Inundation & Flood Zones (Cyan)
 * - Designated Safe Landing Zones (Green)
 * - Projected AI Survivor Detections (Pulsing Magenta Pins)
 */

import maplibregl from 'maplibre-gl';
import { SurvivorPin } from '../stores/mappingStore';

export class Autonomous2DMappingLayer {
  private map: maplibregl.Map | null = null;
  private gridSourceId = 'sutra-2d-mapping-grid-source';
  private gridFillLayerId = 'sutra-2d-mapping-grid-fill';
  private gridOutlineLayerId = 'sutra-2d-mapping-grid-outline';

  private survivorSourceId = 'sutra-2d-mapping-survivors-source';
  private survivorPulseLayerId = 'sutra-2d-mapping-survivors-pulse';
  private survivorCoreLayerId = 'sutra-2d-mapping-survivors-core';

  private lastGeoJson: GeoJSON.FeatureCollection | null = null;
  private lastSurvivors: SurvivorPin[] = [];
  private lastVisibility: Record<string, boolean> = {};

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
      if (this.lastGeoJson) {
        this.updateGrid(this.lastGeoJson, this.lastVisibility);
      }
      if (this.lastSurvivors.length > 0) {
        this.updateSurvivors(this.lastSurvivors);
      }
    });
  }

  public initLayers(): void {
    if (!this.map || !this.map.isStyleLoaded() || this.map.getSource(this.gridSourceId)) return;

    try {
      // 1. World Grid Polygons Source
      this.map.addSource(this.gridSourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // 1A. Semantic Polygon Fill Layer
      this.map.addLayer({
        id: this.gridFillLayerId,
        type: 'fill',
        source: this.gridSourceId,
        paint: {
          'fill-color': [
            'match',
            ['get', 'semantic_type'],
            'FREE', 'rgba(16, 185, 129, 0.20)',
            'ROAD', 'rgba(234, 179, 8, 0.40)',
            'LANDING_ZONE', 'rgba(34, 197, 94, 0.50)',
            'WATER_FLOOD', 'rgba(6, 182, 212, 0.45)',
            'BUILDING', 'rgba(99, 102, 241, 0.50)',
            'OBSTACLE', 'rgba(239, 68, 68, 0.60)',
            'OCCUPIED', 'rgba(249, 115, 22, 0.50)',
            'SURVIVOR', 'rgba(236, 72, 153, 0.75)',
            'rgba(148, 163, 184, 0.15)',
          ],
          'fill-opacity': [
            'interpolate',
            ['linear'],
            ['get', 'confidence'],
            0.0, 0.2,
            1.0, 0.85
          ],
        },
      });

      // 1B. Subtle Grid Outline Layer
      this.map.addLayer({
        id: this.gridOutlineLayerId,
        type: 'line',
        source: this.gridSourceId,
        paint: {
          'line-color': [
            'match',
            ['get', 'semantic_type'],
            'FREE', '#10B981',
            'ROAD', '#EAB308',
            'LANDING_ZONE', '#22C55E',
            'WATER_FLOOD', '#06B6D4',
            'BUILDING', '#6366F1',
            'OBSTACLE', '#EF4444',
            'OCCUPIED', '#F97316',
            'SURVIVOR', '#EC4899',
            '#334155',
          ],
          'line-width': 1.0,
          'line-opacity': 0.55,
        },
      });

      // 2. High-Priority Survivor Pins Source
      this.map.addSource(this.survivorSourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // 2A. Survivor Outer Pulse
      this.map.addLayer({
        id: this.survivorPulseLayerId,
        type: 'circle',
        source: this.survivorSourceId,
        paint: {
          'circle-radius': 14,
          'circle-color': '#EC4899',
          'circle-opacity': 0.35,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#EC4899',
          'circle-stroke-opacity': 0.8,
        },
      });

      // 2B. Survivor Core
      this.map.addLayer({
        id: this.survivorCoreLayerId,
        type: 'circle',
        source: this.survivorSourceId,
        paint: {
          'circle-radius': 6,
          'circle-color': '#FFFFFF',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#EC4899',
        },
      });
    } catch (e) {
      console.warn('Autonomous2DMappingLayer initLayers error:', e);
    }
  }

  public updateGrid(geoJson: GeoJSON.FeatureCollection, visibility?: Record<string, boolean>): void {
    this.lastGeoJson = geoJson;
    if (visibility) this.lastVisibility = visibility;

    if (!this.map || !this.map.isStyleLoaded()) return;
    this.initLayers();

    const source = this.map.getSource(this.gridSourceId) as maplibregl.GeoJSONSource;
    if (!source) return;

    // Filter features if specific semantic categories are toggled off
    let filteredFeatures = geoJson.features;
    if (visibility) {
      filteredFeatures = geoJson.features.filter((f) => {
        const st = f.properties?.semantic_type;
        return st ? visibility[st] !== false : true;
      });
    }

    source.setData({
      type: 'FeatureCollection',
      features: filteredFeatures,
    });
  }

  public updateSurvivors(survivors: SurvivorPin[]): void {
    this.lastSurvivors = survivors;

    if (!this.map || !this.map.isStyleLoaded()) return;
    this.initLayers();

    const source = this.map.getSource(this.survivorSourceId) as maplibregl.GeoJSONSource;
    if (!source) return;

    const features: GeoJSON.Feature[] = survivors.map((s) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [s.longitude, s.latitude],
      },
      properties: {
        cell_id: s.cell_id,
        confidence: s.confidence,
        observed_by: s.observed_by,
        last_observed: s.last_observed,
      },
    }));

    source.setData({
      type: 'FeatureCollection',
      features,
    });
  }

  public clear(): void {
    this.lastGeoJson = null;
    this.lastSurvivors = [];
    if (!this.map || !this.map.isStyleLoaded()) return;

    const gridSource = this.map.getSource(this.gridSourceId) as maplibregl.GeoJSONSource;
    if (gridSource) gridSource.setData({ type: 'FeatureCollection', features: [] });

    const survSource = this.map.getSource(this.survivorSourceId) as maplibregl.GeoJSONSource;
    if (survSource) survSource.setData({ type: 'FeatureCollection', features: [] });
  }
}
