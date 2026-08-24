/**
 * Smart Horizon GCS — Shaded Translucent Geofence Layers & Interactive Drawing
 */

import maplibregl from 'maplibre-gl';
import { Geofence, GeometryType, ZoneType } from '../types/geofence';
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
  private handleMarkers: maplibregl.Marker[] = [];

  public setMap(map: maplibregl.Map | null): void {
    this.map = map;
    if (map && map.isStyleLoaded()) {
      this.initLayers();
    }
  }

  public initLayers(): void {
    if (!this.map || !this.map.isStyleLoaded() || this.map.getSource(this.sourceId)) return;

    try {
      // 1. Authoritative Geofences Source
      this.map.addSource(this.sourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Shaded Fill
      this.map.addLayer({
        id: this.fillLayerId,
        type: 'fill',
        source: this.sourceId,
        paint: {
          'fill-color': [
            'match',
            ['get', 'zone_type'],
            'NO_FLY',
            '#ef4444',
            'WARNING',
            '#f59e0b',
            'SAFE',
            '#10b981',
            '#00e5ff',
          ],
          'fill-opacity': 0.22,
        },
      });

      // Border Lines
      this.map.addLayer({
        id: this.borderLayerId,
        type: 'line',
        source: this.sourceId,
        paint: {
          'line-color': [
            'match',
            ['get', 'zone_type'],
            'NO_FLY',
            '#ef4444',
            'WARNING',
            '#f59e0b',
            'SAFE',
            '#10b981',
            '#00e5ff',
          ],
          'line-width': 2.5,
          'line-opacity': 0.9,
        },
      });

      // 2. Active Drawing Session Source & Layers
      this.map.addSource(this.drawingSourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      this.map.addLayer({
        id: this.drawingFillLayerId,
        type: 'fill',
        source: this.drawingSourceId,
        paint: {
          'fill-color': '#00e5ff',
          'fill-opacity': 0.25,
        },
      });

      this.map.addLayer({
        id: this.drawingBorderLayerId,
        type: 'line',
        source: this.drawingSourceId,
        paint: {
          'line-color': '#00e5ff',
          'line-width': 2,
          'line-dasharray': [3, 2],
        },
      });

      // Click to select
      this.map.on('click', this.fillLayerId, (e) => {
        const { drawing_mode } = useGeofenceStore.getState();
        const { interactionMode } = useMapStore.getState();
        if (drawing_mode || interactionMode === 'DRAW_GEOFENCE' || interactionMode === 'ADD_WAYPOINT') {
          // Pass click through to drawing/waypoint handler
          return;
        }
        if (e.features && e.features[0]) {
          const id = e.features[0].properties?.id;
          if (id) {
            useSelectionStore.getState().selectGeofence(id);
            commandManager.sendCommand('GEOFENCE_SELECT', { geofence_id: id });
          }
        }
      });
    } catch (e) {
      console.warn('GeofenceLayer initLayers error:', e);
    }
  }

  public updateGeofences(geofences: Geofence[], selectedId: string | null = null): void {
    if (!this.map || !this.map.isStyleLoaded()) return;
    this.initLayers();

    const features: any[] = [];
    geofences.forEach((g) => {
      if (!g.visible) return;

      let polygonCoords: [number, number][][] = [];
      if (g.geometry_type === 'CIRCLE' && g.center && g.radius) {
        polygonCoords = [this.generateCirclePolygon(g.center[0], g.center[1], g.radius)];
      } else if (g.coordinates && g.coordinates.length >= 3) {
        const closed = [...g.coordinates];
        if (
          closed[0][0] !== closed[closed.length - 1][0] ||
          closed[0][1] !== closed[closed.length - 1][1]
        ) {
          closed.push(closed[0]);
        }
        polygonCoords = [closed.map((c) => [c[1], c[0]])];
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
          },
          geometry: {
            type: 'Polygon',
            coordinates: polygonCoords,
          },
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
    this.initLayers();

    const drawingCoords = [...points];
    if (preview) {
      drawingCoords.push(preview);
    }

    const features: any[] = [];
    if (drawingCoords.length >= 3) {
      const closed = [...drawingCoords, drawingCoords[0]];
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [closed.map((p) => [p[1], p[0]])],
        },
      });
    } else if (drawingCoords.length === 2) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: drawingCoords.map((p) => [p[1], p[0]]),
        },
      });
    }

    const source = this.map.getSource(this.drawingSourceId) as maplibregl.GeoJSONSource;
    if (source) {
      source.setData({ type: 'FeatureCollection', features });
    }
  }

  private renderHandles(geofence?: Geofence): void {
    this.handleMarkers.forEach((m) => m.remove());
    this.handleMarkers = [];

    if (!geofence || !this.map || geofence.geometry_type !== 'POLYGON') return;

    geofence.coordinates.forEach((coord, idx) => {
      const el = document.createElement('div');
      el.className =
        'w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-white shadow cursor-move hover:scale-125 transition-transform';

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

  private generateCirclePolygon(lat: number, lon: number, radiusM: number, points = 36): [number, number][] {
    const coords: [number, number][] = [];
    const earthRadius = 6371000;
    const dLat = radiusM / earthRadius;
    const dLon = radiusM / (earthRadius * Math.cos((Math.PI * lat) / 180));

    for (let i = 0; i <= points; i++) {
      const theta = (i * 2 * Math.PI) / points;
      const pLat = lat + dLat * (180 / Math.PI) * Math.sin(theta);
      const pLon = lon + dLon * (180 / Math.PI) * Math.cos(theta);
      coords.push([pLon, pLat]);
    }
    return coords;
  }
}
