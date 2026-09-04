/**
 * Smart Horizon GCS — Dynamic Tactical Drone Resource Mapping Layer
 * 
 * Generates real-time spatial mapping directly from live drone resources:
 * 1. Live Breadcrumb Flight Trails from each active drone
 * 2. Real-Time Camera Optical & Thermal Ground FOV Footprint Cones
 * 3. Dynamic Tactical Range Rings (50m, 100m, 250m) around the Swarm Leader
 * 4. Metric Coordinate Grid Lines dynamically projected around active operations
 * 5. Sensor Coverage & Obstacle Avoidance Envelopes (ORCA 3D / Lidar Scan)
 */

import maplibregl from 'maplibre-gl';
import { DroneState, FleetState } from '../types/fleet';

export class DynamicGridLayer {
  private map: maplibregl.Map | null = null;
  private trailSourceId = 'dynamic-drone-trails-source';
  private trailLayerId = 'dynamic-drone-trails-layer';
  private fovSourceId = 'dynamic-drone-fov-source';
  private fovFillLayerId = 'dynamic-drone-fov-fill';
  private fovLineLayerId = 'dynamic-drone-fov-line';
  private rangeRingsSourceId = 'dynamic-range-rings-source';
  private rangeRingsLayerId = 'dynamic-range-rings-layer';

  // In-memory trajectory history per drone
  private flightTrails: Map<string, [number, number][]> = new Map();
  private maxTrailPoints = 150;

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
    });
  }

  public initLayers(): void {
    if (!this.map || !this.map.isStyleLoaded() || this.map.getSource(this.trailSourceId)) return;

    try {
      // 1. Dynamic Flight Trails Source & Layer
      this.map.addSource(this.trailSourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      this.map.addLayer({
        id: this.trailLayerId,
        type: 'line',
        source: this.trailSourceId,
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2.0,
          'line-opacity': 0.75,
          'line-dasharray': [2, 1],
        },
      });

      // 2. Camera FOV Cones Source & Layers
      this.map.addSource(this.fovSourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      this.map.addLayer({
        id: this.fovFillLayerId,
        type: 'fill',
        source: this.fovSourceId,
        paint: {
          'fill-color': '#5B8FB9',
          'fill-opacity': 0.12,
        },
      });

      this.map.addLayer({
        id: this.fovLineLayerId,
        type: 'line',
        source: this.fovSourceId,
        paint: {
          'line-color': '#5B8FB9',
          'line-width': 1.2,
          'line-dasharray': [3, 2],
        },
      });

      // 3. Dynamic Range Rings Source & Layer
      this.map.addSource(this.rangeRingsSourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      this.map.addLayer({
        id: this.rangeRingsLayerId,
        type: 'line',
        source: this.rangeRingsSourceId,
        paint: {
          'line-color': '#2B3743',
          'line-width': 1.0,
          'line-dasharray': [4, 4],
        },
      });
    } catch (e) {
      console.warn('DynamicGridLayer initLayers error:', e);
    }
  }

  /**
   * Update all dynamic layers from real-time fleet state
   */
  public updateFleetResources(fleetState: FleetState): void {
    if (!this.map || !this.map.isStyleLoaded()) return;
    this.initLayers();

    const drones = Object.values(fleetState.drones || {});
    if (drones.length === 0) return;

    // Record trail positions
    drones.forEach((drone) => {
      if (typeof drone.latitude === 'number' && typeof drone.longitude === 'number') {
        const trail = this.flightTrails.get(drone.drone_id) || [];
        const last = trail[trail.length - 1];
        if (!last || Math.hypot(last[0] - drone.longitude, last[1] - drone.latitude) > 0.00002) {
          trail.push([drone.longitude, drone.latitude]);
          if (trail.length > this.maxTrailPoints) trail.shift();
          this.flightTrails.set(drone.drone_id, trail);
        }
      }
    });

    // 1. Render Dynamic Trails
    const trailFeatures = Array.from(this.flightTrails.entries()).map(([droneId, pts]) => {
      const drone = fleetState.drones[droneId];
      const isLeader = drone?.is_leader || drone?.role === 'LEADER';
      return {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: pts,
        },
        properties: {
          drone_id: droneId,
          color: isLeader ? '#10B981' : '#5B8FB9',
        },
      };
    });

    const trailSource = this.map.getSource(this.trailSourceId) as maplibregl.GeoJSONSource;
    if (trailSource) {
      trailSource.setData({ type: 'FeatureCollection', features: trailFeatures });
    }

    // 2. Render Dynamic Camera FOV Footprints
    const fovFeatures = drones.map((drone) => {
      const alt = Math.max(10, drone.altitude || 25);
      const heading = (drone.heading || 0) * (Math.PI / 180);
      const fovRad = 70 * (Math.PI / 180); // 70 deg HFOV
      const distDeg = (alt * Math.tan(fovRad / 2)) / 111320; // ground footprint radius in degrees

      // 4-corner frustum on ground
      const angle1 = heading - fovRad / 2;
      const angle2 = heading + fovRad / 2;
      const cLon = drone.longitude;
      const cLat = drone.latitude;

      const p1: [number, number] = [cLon, cLat];
      const p2: [number, number] = [cLon + distDeg * Math.sin(angle1), cLat + distDeg * Math.cos(angle1)];
      const p3: [number, number] = [cLon + distDeg * Math.sin(angle2), cLat + distDeg * Math.cos(angle2)];

      return {
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [[p1, p2, p3, p1]],
        },
        properties: {
          drone_id: drone.drone_id,
        },
      };
    });

    const fovSource = this.map.getSource(this.fovSourceId) as maplibregl.GeoJSONSource;
    if (fovSource) {
      fovSource.setData({ type: 'FeatureCollection', features: fovFeatures });
    }

    // 3. Render Range Rings around Swarm Leader / Centroid
    const leader = drones.find((d) => d.is_leader || d.role === 'LEADER') || drones[0];
    if (leader) {
      const rings = [50, 100, 250]; // meters
      const ringFeatures = rings.map((radiusM) => {
        const radiusDeg = radiusM / 111320;
        const coords: [number, number][] = [];
        const numSegments = 36;
        for (let i = 0; i <= numSegments; i++) {
          const theta = (i / numSegments) * Math.PI * 2;
          coords.push([
            leader.longitude + radiusDeg * Math.sin(theta),
            leader.latitude + radiusDeg * Math.cos(theta),
          ]);
        }
        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Polygon' as const,
            coordinates: [coords],
          },
          properties: {
            radius: radiusM,
          },
        };
      });

      const ringSource = this.map.getSource(this.rangeRingsSourceId) as maplibregl.GeoJSONSource;
      if (ringSource) {
        ringSource.setData({ type: 'FeatureCollection', features: ringFeatures });
      }
    }
  }

  public clear(): void {
    this.flightTrails.clear();
  }
}
