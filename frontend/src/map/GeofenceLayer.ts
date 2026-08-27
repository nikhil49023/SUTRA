/**
 * Smart Horizon GCS — Persistent Geofence Layers & Interactive Drawing
 *
 * Supports:
 * - Geometries: POLYGON, CIRCLE, CORRIDOR
 * - Zone Types: NO_FLY, WARNING, SAFE, INCLUSION, EXCLUSION
 * - Real-time vertex dots and dynamic rubberband line/polygon previews during drawing
 * - Permanent visibility across map style switches and tab navigation
 * - Bidirectional selection with prominent tactical highlights
 * - Interactive vertex moving handles for selected polygon geofences
 * - Single MapLibre GeoJSON source with efficient setData()
 */

import maplibregl from 'maplibre-gl';
import { Geofence } from '../types/geofence';
import { useSelectionStore } from '../stores/selectionStore';
import { useGeofenceStore } from '../stores/geofenceStore';
import { useMapStore } from '../stores/mapStore';
import { commandManager } from '../communication/CommandManager';

export class GeofenceLayer {
  private map: maplibregl.Map | null = null;
  private sourceId = 'geofences-source';
  private fillLayerId = 'geofences-fill';
  private borderLayerId = 'geofences-border';
  private drawingSourceId = 'geofence-drawing-source';
  private drawingFillLayerId = 'geofence-drawing-fill';
  private drawingBorderLayerId = 'geofence-drawing-border';
  private drawingPointsLayerId = 'geofence-drawing-points';
  private handleMarkers: maplibregl.Marker[] = [];

  /** Last known geofences for re-rendering after style reload */
  private lastGeofences: Geofence[] = [];
  private lastSelectedId: string | null = null;

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
      if (this.lastGeofences.length > 0) {
        this.updateGeofences(this.lastGeofences, this.lastSelectedId);
      }
    });
  }

  public initLayers(): void {
    if (!this.map || !this.map.isStyleLoaded()) return;

    if (this.map.getSource(this.sourceId)) return;

    try {
      // ── Authoritative Geofences Source ──────────────────────────────────────
      this.map.addSource(this.sourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Fill — zone-type color + stronger fill when selected
      this.map.addLayer({
        id: this.fillLayerId,
        type: 'fill',
        source: this.sourceId,
        paint: {
          'fill-color': [
            'match', ['get', 'zone_type'],
            'NO_FLY',    '#C75A5A',
            'WARNING',   '#C49A4A',
            'SAFE',      '#4F9A72',
            'INCLUSION', '#5B8FB9',
            'EXCLUSION', '#C75A5A',
            '#5B8FB9',
          ],
          'fill-opacity': [
            'case', ['==', ['get', 'selected'], true],
            0.32,
            ['match', ['get', 'zone_type'],
              'NO_FLY',    0.20,
              'WARNING',   0.20,
              'SAFE',      0.18,
              'INCLUSION', 0.16,
              'EXCLUSION', 0.20,
              0.18,
            ],
          ],
        },
      });

      // Border — solid, brighter when selected
      this.map.addLayer({
        id: this.borderLayerId,
        type: 'line',
        source: this.sourceId,
        paint: {
          'line-color': [
            'match', ['get', 'zone_type'],
            'NO_FLY',    '#C75A5A',
            'WARNING',   '#C49A4A',
            'SAFE',      '#4F9A72',
            'INCLUSION', '#5B8FB9',
            'EXCLUSION', '#C75A5A',
            '#5B8FB9',
          ],
          'line-width': ['case', ['==', ['get', 'selected'], true], 3.5, 2.0],
          'line-opacity': ['case', ['==', ['get', 'selected'], true], 1.0, 0.85],
        },
      });

      // ── Drawing Preview Source & Layers ─────────────────────────────────────
      this.map.addSource(this.drawingSourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      this.map.addLayer({
        id: this.drawingFillLayerId,
        type: 'fill',
        source: this.drawingSourceId,
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: {
          'fill-color': '#5B8FB9',
          'fill-opacity': 0.22,
        },
      });

      this.map.addLayer({
        id: this.drawingBorderLayerId,
        type: 'line',
        source: this.drawingSourceId,
        filter: ['!=', ['geometry-type'], 'Point'],
        paint: {
          'line-color': '#5B8FB9',
          'line-width': 2.5,
          'line-dasharray': [4, 2],
        },
      });

      this.map.addLayer({
        id: this.drawingPointsLayerId,
        type: 'circle',
        source: this.drawingSourceId,
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-radius': 5,
          'circle-color': '#5B8FB9',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
        },
      });

      // Click to select geofence from map
      this.map.on('click', this.fillLayerId, (e) => {
        const { drawing_mode } = useGeofenceStore.getState();
        const { interactionMode } = useMapStore.getState();
        if (drawing_mode || interactionMode === 'DRAW_GEOFENCE' || interactionMode === 'ADD_WAYPOINT') return;
        if (e.features && e.features[0]) {
          const id = e.features[0].properties?.id;
          if (id) {
            useSelectionStore.getState().selectGeofence(id);
            commandManager.sendCommand('GEOFENCE_SELECT', { geofence_id: id });
          }
        }
      });

      // Pointer cursor over geofences
      this.map.on('mouseenter', this.fillLayerId, () => {
        if (!this.map) return;
        const { drawing_mode } = useGeofenceStore.getState();
        if (!drawing_mode) this.map.getCanvas().style.cursor = 'pointer';
      });
      this.map.on('mouseleave', this.fillLayerId, () => {
        if (!this.map) return;
        const { interactionMode } = useMapStore.getState();
        this.map.getCanvas().style.cursor = interactionMode === 'DRAW_GEOFENCE' ? 'crosshair' : '';
      });
    } catch (e) {
      console.warn('[GeofenceLayer] initLayers error:', e);
    }
  }

  public updateGeofences(geofences: Geofence[], selectedId: string | null = null): void {
    this.lastGeofences = geofences;
    this.lastSelectedId = selectedId;

    if (!this.map || !this.map.isStyleLoaded()) return;

    if (!this.map.getSource(this.sourceId)) {
      this.initLayers();
    }

    const features: any[] = [];
    geofences.forEach((g) => {
      if (g.visible === false) return;

      let polygonCoords: [number, number][][] = [];

      if (g.geometry_type === 'CIRCLE') {
        const center = g.center || (g.coordinates && g.coordinates.length > 0 ? g.coordinates[0] : null);
        if (center) {
          polygonCoords = [this.generateCirclePolygon(center[0], center[1], g.radius ?? 200)];
        }
      } else if (g.geometry_type === 'CORRIDOR' && g.coordinates && g.coordinates.length >= 2) {
        polygonCoords = [this.generateCorridorPolygon(g.coordinates, g.corridor_width ?? 50)];
      } else if (g.coordinates && g.coordinates.length >= 3) {
        const closed = [...g.coordinates];
        const first = closed[0];
        const last = closed[closed.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          closed.push(first);
        }
        // [lat, lon] → [lon, lat] for GeoJSON
        polygonCoords = [closed.map((c) => [c[1], c[0]] as [number, number])];
      }

      if (polygonCoords.length > 0) {
        features.push({
          type: 'Feature',
          id: g.id,
          properties: {
            id: g.id,
            name: g.name,
            zone_type: g.zone_type,
            selected: g.id === selectedId,
            enabled: g.enabled,
          },
          geometry: { type: 'Polygon', coordinates: polygonCoords },
        });
      }
    });

    const source = this.map.getSource(this.sourceId) as maplibregl.GeoJSONSource;
    if (source) {
      source.setData({ type: 'FeatureCollection', features });
    }

    this.renderHandles(geofences.find((g) => g.id === selectedId));
  }

  public updateDrawingSession(points: [number, number][], preview?: [number, number] | null): void {
    if (!this.map || !this.map.isStyleLoaded()) return;

    if (!this.map.getSource(this.drawingSourceId)) {
      this.initLayers();
    }

    const source = this.map.getSource(this.drawingSourceId) as maplibregl.GeoJSONSource;
    if (!source) return;

    if (points.length === 0 && !preview) {
      source.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    const { active_geometry_type } = useGeofenceStore.getState();
    const features: any[] = [];

    // 1. Add vertex dots for all placed points
    points.forEach((p, idx) => {
      features.push({
        type: 'Feature',
        id: `vertex-${idx}`,
        properties: { isVertex: true, vertexIndex: idx },
        geometry: {
          type: 'Point',
          coordinates: [p[1], p[0]],
        },
      });
    });

    // 2. Add cursor preview dot if mouse is moving
    if (preview) {
      features.push({
        type: 'Feature',
        id: 'preview-dot',
        properties: { isPreview: true },
        geometry: {
          type: 'Point',
          coordinates: [preview[1], preview[0]],
        },
      });
    }

    // Combine placed points + preview for live shape preview
    const drawingCoords = [...points];
    if (preview) drawingCoords.push(preview);

    // 3. Shape preview based on active geometry type
    if (active_geometry_type === 'CIRCLE' && drawingCoords.length >= 1) {
      const center = drawingCoords[0];
      let radius = 200;
      if (drawingCoords.length >= 2) {
        radius = Math.max(10, this.calculateDistance(center[0], center[1], drawingCoords[1][0], drawingCoords[1][1]));
      }
      features.push({
        type: 'Feature',
        properties: { isShape: true },
        geometry: {
          type: 'Polygon',
          coordinates: [this.generateCirclePolygon(center[0], center[1], radius)],
        },
      });
    } else if (active_geometry_type === 'CORRIDOR' && drawingCoords.length >= 2) {
      features.push({
        type: 'Feature',
        properties: { isShape: true },
        geometry: {
          type: 'Polygon',
          coordinates: [this.generateCorridorPolygon(drawingCoords, 50)],
        },
      });
    } else if (drawingCoords.length >= 3) {
      const closed = [...drawingCoords, drawingCoords[0]];
      features.push({
        type: 'Feature',
        properties: { isShape: true },
        geometry: {
          type: 'Polygon',
          coordinates: [closed.map((p) => [p[1], p[0]])],
        },
      });
    } else if (drawingCoords.length === 2) {
      features.push({
        type: 'Feature',
        properties: { isShape: true },
        geometry: {
          type: 'LineString',
          coordinates: drawingCoords.map((p) => [p[1], p[0]]),
        },
      });
    }

    source.setData({ type: 'FeatureCollection', features });
  }

  /** Fit the camera to show all coordinates of the given geofence */
  public fitGeofence(geofence: Geofence): void {
    if (!this.map) return;
    let coords: [number, number][] = [];

    if (geofence.geometry_type === 'CIRCLE') {
      const center = geofence.center || (geofence.coordinates && geofence.coordinates.length > 0 ? geofence.coordinates[0] : null);
      if (center) {
        coords = this.generateCirclePolygon(center[0], center[1], geofence.radius ?? 200).map(
          (c) => [c[1], c[0]]
        );
      }
    } else if (geofence.geometry_type === 'CORRIDOR' && geofence.coordinates && geofence.coordinates.length >= 2) {
      coords = this.generateCorridorPolygon(geofence.coordinates, geofence.corridor_width ?? 50).map(
        (c) => [c[1], c[0]]
      );
    } else if (geofence.coordinates && geofence.coordinates.length > 0) {
      coords = geofence.coordinates;
    }

    if (!coords || coords.length === 0) return;

    const lats = coords.map((c) => c[0]);
    const lons = coords.map((c) => c[1]);
    const bounds: maplibregl.LngLatBoundsLike = [
      [Math.min(...lons), Math.min(...lats)],
      [Math.max(...lons), Math.max(...lats)],
    ];
    this.map.fitBounds(bounds, { padding: 80, maxZoom: 16 });
  }

  private renderHandles(geofence?: Geofence): void {
    this.handleMarkers.forEach((m) => m.remove());
    this.handleMarkers = [];

    if (!geofence || !this.map || geofence.geometry_type !== 'POLYGON') return;

    geofence.coordinates.forEach((coord, idx) => {
      const el = document.createElement('div');
      el.className =
        'w-3.5 h-3.5 rounded-full bg-[#5B8FB9] border-2 border-[#E7EBEF] shadow cursor-move hover:scale-125 transition-transform';

      const marker = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat([coord[1], coord[0]])
        .addTo(this.map!);

      marker.on('drag', () => {
        const lngLat = marker.getLngLat();
        const currentGfs = useGeofenceStore.getState().geofences;
        const target = currentGfs.find((g) => g.id === geofence.id);
        if (target) {
          const updatedCoords = [...target.coordinates];
          updatedCoords[idx] = [lngLat.lat, lngLat.lng];
          useGeofenceStore.getState().updateGeofence(geofence.id, { coordinates: updatedCoords });
        }
      });

      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        commandManager.sendCommand('geofence.move_vertex', {
          geofence_id: geofence.id,
          vertex_index: idx,
          latitude: lngLat.lat,
          longitude: lngLat.lng,
        });
      });

      this.handleMarkers.push(marker);
    });
  }

  /** Generates [lon, lat][] circle boundary for GeoJSON */
  private generateCirclePolygon(lat: number, lon: number, radiusM: number, points = 48): [number, number][] {
    const coords: [number, number][] = [];
    const earthRadius = 6371000;
    const dLat = radiusM / earthRadius;
    const dLon = radiusM / (earthRadius * Math.cos((Math.PI * lat) / 180));

    for (let i = 0; i <= points; i++) {
      const theta = (i * 2 * Math.PI) / points;
      const pLat = lat + dLat * (180 / Math.PI) * Math.sin(theta);
      const pLon = lon + dLon * (180 / Math.PI) * Math.cos(theta);
      coords.push([pLon, pLat]); // [lon, lat] for GeoJSON
    }
    return coords;
  }

  /** Generates buffered corridor [lon, lat][] polygon */
  private generateCorridorPolygon(points: [number, number][], widthM: number): [number, number][] {
    if (points.length < 2) return [];
    const leftCoords: [number, number][] = [];
    const rightCoords: [number, number][] = [];
    const halfWidth = widthM / 2.0;

    for (let i = 0; i < points.length; i++) {
      const curr = points[i];
      let dx = 0;
      let dy = 0;

      if (i < points.length - 1) {
        const next = points[i + 1];
        dx = next[1] - curr[1];
        dy = next[0] - curr[0];
      } else {
        const prev = points[i - 1];
        dx = curr[1] - prev[1];
        dy = curr[0] - prev[0];
      }

      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) continue;

      // Normal vector
      const nx = -dy / len;
      const ny = dx / len;

      const earthRadius = 6371000;
      const dLat = (halfWidth / earthRadius) * (180 / Math.PI);
      const dLon = (halfWidth / (earthRadius * Math.cos((Math.PI * curr[0]) / 180))) * (180 / Math.PI);

      leftCoords.push([curr[1] + nx * dLon, curr[0] + ny * dLat]);
      rightCoords.unshift([curr[1] - nx * dLon, curr[0] - ny * dLat]);
    }

    const corridor = [...leftCoords, ...rightCoords];
    if (corridor.length > 0) {
      corridor.push(corridor[0]);
    }
    return corridor;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
