/**
 * Smart Horizon GCS — Formation Target Positions & Guide Lines Layer
 */

import maplibregl from 'maplibre-gl';
import { FleetState } from '../types/fleet';

export class FormationLayer {
  private map: maplibregl.Map | null = null;
  private sourceId = 'formation-guides-source';
  private lineLayerId = 'formation-guides-line';
  private lastFleetState: FleetState | null = null;

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
      if (this.lastFleetState) {
        this.updateFormation(this.lastFleetState);
      }
    });
  }

  public initLayers(): void {
    if (!this.map || !this.map.isStyleLoaded() || this.map.getSource(this.sourceId)) return;

    try {
      this.map.addSource(this.sourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      this.map.addLayer({
        id: this.lineLayerId,
        type: 'line',
        source: this.sourceId,
        paint: {
          'line-color': '#5B8FB9',
          'line-width': 1.2,
          'line-dasharray': [2, 3],
          'line-opacity': 0.6,
        },
      });
    } catch (e) {
      console.warn('FormationLayer initLayers error:', e);
    }
  }

  public updateFormation(fleet: FleetState): void {
    this.lastFleetState = fleet;

    if (!this.map || !this.map.isStyleLoaded() || !fleet.show_guides) return;
    this.initLayers();

    const leader = fleet.leader_id ? fleet.drones[fleet.leader_id] : null;
    const features: any[] = [];

    if (leader) {
      Object.values(fleet.drones).forEach((drone) => {
        if (!drone.is_leader && drone.drone_id !== fleet.leader_id) {
          const targetLon = drone.target_longitude || drone.longitude;
          const targetLat = drone.target_latitude || drone.latitude;

          features.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [
                [leader.longitude, leader.latitude],
                [targetLon, targetLat],
              ],
            },
            properties: {},
          });
        }
      });
    }

    const source = this.map.getSource(this.sourceId) as maplibregl.GeoJSONSource;
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features,
      });
    }
  }
}
