/**
 * Smart Horizon GCS — Real-Time Video Feed & Camera Ground Projection Mapping Layer
 * Subsystem: Subsystem D (3D GIS GCS / 2D Autonomous Video Mapping Engine)
 * 
 * Physically projects live drone video feeds, camera frustum footprints, and incremental
 * visual swaths onto the 2D world map:
 * 1. Computes exact 4-corner ground projection from drone pose & camera optics (HFOV 70°, VFOV 52°).
 * 2. Projects live drone camera frames directly onto the 2D ground plane at the drone's coordinates.
 * 3. Renders animated camera scanning beam, aperture bounds, and laser crosshairs.
 * 4. Stitches and draws persistent explored visual ground swaths incrementally as the drones fly.
 * 5. Provides high-precision metric tactical grid lines & origin marks.
 */

import maplibregl from 'maplibre-gl';
import { DroneState, FleetState } from '../types/fleet';
import { CameraFrameData } from '../stores/cameraStore';

export interface GroundFootprint {
  drone_id: string;
  top_left: [number, number];     // [lon, lat]
  top_right: [number, number];
  bottom_right: [number, number];
  bottom_left: [number, number];
  center: [number, number];
  altitude_m: number;
  heading_deg: number;
  width_m: number;
  length_m: number;
  timestamp: number;
}

export class VideoFeedMappingLayer {
  private map: maplibregl.Map | null = null;

  // Layer & Source IDs
  private liveFrustumSourceId = 'sutra-video-live-frustum-source';
  private liveFrustumFillLayerId = 'sutra-video-live-frustum-fill';
  private liveFrustumLineLayerId = 'sutra-video-live-frustum-line';
  private liveFrustumLaserLayerId = 'sutra-video-live-frustum-laser';

  private stitchedSwathSourceId = 'sutra-video-stitched-swath-source';
  private stitchedSwathFillLayerId = 'sutra-video-stitched-swath-fill';
  private stitchedSwathLineLayerId = 'sutra-video-stitched-swath-line';

  private tacticalGridSourceId = 'sutra-tactical-grid-source';
  private tacticalGridLineLayerId = 'sutra-tactical-grid-line';

  // In-memory stitched ground swaths (the progressive map drawn by drone cameras)
  private stitchedSwaths: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
  private lastDronePositions: Map<string, { lat: number; lon: number; time: number }> = new Map();
  private maxStitchedSwaths = 400;

  // Animation frame for scanning laser
  private laserPhase = 0.0;
  private animFrameId: number | null = null;
  private lastFleetState: FleetState | null = null;

  // Camera Optical Specs (70° Horizontal FOV, 52° Vertical FOV)
  private hfovRad = 70.0 * (Math.PI / 180.0);
  private vfovRad = 52.0 * (Math.PI / 180.0);

  public setMap(map: maplibregl.Map | null): void {
    this.map = map;
    if (!map) {
      if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
      return;
    }

    if (map.isStyleLoaded()) {
      this.initLayers();
    } else {
      map.once('load', () => this.initLayers());
    }

    map.on('style.load', () => {
      this.initLayers();
      this.rebuildTacticalGrid();
      if (this.lastFleetState) {
        this.updateFleetVideoProjections(this.lastFleetState);
      }
    });

    this.startLaserAnimation();
  }

  public initLayers(): void {
    if (!this.map || !this.map.isStyleLoaded() || this.map.getSource(this.liveFrustumSourceId)) return;

    try {
      // ── 1. Tactical Metric Coordinate Grid Lines ───────────────────────────
      this.map.addSource(this.tacticalGridSourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      this.map.addLayer({
        id: this.tacticalGridLineLayerId,
        type: 'line',
        source: this.tacticalGridSourceId,
        paint: {
          'line-color': '#1E293B',
          'line-width': 1.0,
          'line-opacity': 0.7,
        },
      });

      // ── 2. Stitched Explored Video Swaths (Drawn Map from Camera Feed) ───────
      this.map.addSource(this.stitchedSwathSourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      this.map.addLayer({
        id: this.stitchedSwathFillLayerId,
        type: 'fill',
        source: this.stitchedSwathSourceId,
        paint: {
          'fill-color': [
            'case',
            ['==', ['get', 'modality'], 'THERMAL'],
            '#F59E0B',
            '#10B981',
          ],
          'fill-opacity': 0.25,
        },
      });

      this.map.addLayer({
        id: this.stitchedSwathLineLayerId,
        type: 'line',
        source: this.stitchedSwathSourceId,
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'modality'], 'THERMAL'],
            '#F59E0B',
            '#10B981',
          ],
          'line-width': 1.0,
          'line-opacity': 0.45,
        },
      });

      // ── 3. Active Real-Time Camera Ground Footprint (Frustum) ────────────────
      this.map.addSource(this.liveFrustumSourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Frustum Fill (Dynamic Optical Aperture)
      this.map.addLayer({
        id: this.liveFrustumFillLayerId,
        type: 'fill',
        source: this.liveFrustumSourceId,
        paint: {
          'fill-color': [
            'case',
            ['==', ['get', 'is_leader'], true],
            '#10B981',
            '#5B8FB9',
          ],
          'fill-opacity': 0.28,
        },
      });

      // Frustum Outline & Corner Aperture Brackets
      this.map.addLayer({
        id: this.liveFrustumLineLayerId,
        type: 'line',
        source: this.liveFrustumSourceId,
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'is_leader'], true],
            '#10B981',
            '#5B8FB9',
          ],
          'line-width': 2.0,
          'line-opacity': 0.95,
        },
      });

      // Active Scanning Laser Beam inside Camera FOV
      this.map.addLayer({
        id: this.liveFrustumLaserLayerId,
        type: 'line',
        source: this.liveFrustumSourceId,
        paint: {
          'line-color': '#EC4899',
          'line-width': 2.5,
          'line-opacity': 0.9,
        },
      });

      this.rebuildTacticalGrid();
    } catch (e) {
      console.warn('VideoFeedMappingLayer initLayers error:', e);
    }
  }

  /**
   * Computes exact 4-corner ground projection for a drone camera.
   */
  public calculateGroundFootprint(
    lat: number,
    lon: number,
    alt: number,
    headingDeg: number
  ): GroundFootprint {
    const altM = Math.max(alt, 4.0);
    const headingRad = headingDeg * (Math.PI / 180.0);

    const halfWidthM = altM * Math.tan(this.hfovRad / 2.0);
    const halfLengthM = altM * Math.tan(this.vfovRad / 2.0);

    const cosH = Math.cos(headingRad);
    const sinH = Math.sin(headingRad);

    // Compute 4 rotated corner offsets in meters relative to drone [east, north]
    // Top-Left (-width, +length)
    const tlEast = -halfWidthM * cosH - halfLengthM * sinH;
    const tlNorth = -halfWidthM * sinH + halfLengthM * cosH;

    // Top-Right (+width, +length)
    const trEast = halfWidthM * cosH - halfLengthM * sinH;
    const trNorth = halfWidthM * sinH + halfLengthM * cosH;

    // Bottom-Right (+width, -length)
    const brEast = halfWidthM * cosH + halfLengthM * sinH;
    const brNorth = halfWidthM * sinH - halfLengthM * cosH;

    // Bottom-Left (-width, -length)
    const blEast = -halfWidthM * cosH + halfLengthM * sinH;
    const blNorth = -halfWidthM * sinH - halfLengthM * cosH;

    const metersPerLat = 111320.0;
    const metersPerLon = 111320.0 * Math.max(Math.cos(lat * (Math.PI / 180.0)), 0.01);

    const tl: [number, number] = [lon + tlEast / metersPerLon, lat + tlNorth / metersPerLat];
    const tr: [number, number] = [lon + trEast / metersPerLon, lat + trNorth / metersPerLat];
    const br: [number, number] = [lon + brEast / metersPerLon, lat + brNorth / metersPerLat];
    const bl: [number, number] = [lon + blEast / metersPerLon, lat + blNorth / metersPerLat];

    return {
      drone_id: '',
      top_left: tl,
      top_right: tr,
      bottom_right: br,
      bottom_left: bl,
      center: [lon, lat],
      altitude_m: altM,
      heading_deg: headingDeg,
      width_m: roundNum(halfWidthM * 2, 1),
      length_m: roundNum(halfLengthM * 2, 1),
      timestamp: Date.now() / 1000,
    };
  }

  /**
   * Ingests fleet kinematics and projects real-time camera frustums & stitches visual swaths.
   */
  public updateFleetVideoProjections(fleetState: FleetState): void {
    this.lastFleetState = fleetState;
    if (!this.map || !this.map.isStyleLoaded()) return;
    this.initLayers();

    const drones = Object.values(fleetState.drones || {});
    if (drones.length === 0) return;

    const now = Date.now() / 1000;
    const frustumFeatures: GeoJSON.Feature[] = [];

    drones.forEach((drone) => {
      if (typeof drone.latitude !== 'number' || typeof drone.longitude !== 'number') return;

      const footprint = this.calculateGroundFootprint(
        drone.latitude,
        drone.longitude,
        drone.altitude || 25.0,
        drone.heading || 0.0
      );
      footprint.drone_id = drone.drone_id;

      const isLeader = drone.is_leader || drone.role === 'LEADER';
      const coords = [
        footprint.top_left,
        footprint.top_right,
        footprint.bottom_right,
        footprint.bottom_left,
        footprint.top_left,
      ];

      // 1. Live Frustum Polygon Feature
      frustumFeatures.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [coords],
        },
        properties: {
          drone_id: drone.drone_id,
          is_leader: isLeader,
          altitude: footprint.altitude_m,
          width_m: footprint.width_m,
          length_m: footprint.length_m,
          type: 'frustum_fill',
        },
      });

      // 2. Active Laser Scan Line across the Footprint
      const p1 = footprint.top_left;
      const p2 = footprint.top_right;
      const p3 = footprint.bottom_right;
      const p4 = footprint.bottom_left;

      const phase = this.laserPhase;
      const laserLeft: [number, number] = [
        p1[0] + (p4[0] - p1[0]) * phase,
        p1[1] + (p4[1] - p1[1]) * phase,
      ];
      const laserRight: [number, number] = [
        p2[0] + (p3[0] - p2[0]) * phase,
        p2[1] + (p3[1] - p2[1]) * phase,
      ];

      frustumFeatures.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [laserLeft, laserRight],
        },
        properties: {
          drone_id: drone.drone_id,
          is_laser: true,
        },
      });

      // 3. Stitched Swath Accumulator (Draw Map from Video Feed)
      const last = this.lastDronePositions.get(drone.drone_id);
      const dist = last ? Math.hypot(last.lon - drone.longitude, last.lat - drone.latitude) : 1.0;

      // Deposit a new explored visual swath if drone moved > 0.00003 deg (~3.3m)
      if (!last || dist > 0.00003) {
        this.stitchedSwaths.push({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [coords],
          },
          properties: {
            drone_id: drone.drone_id,
            timestamp: now,
            altitude: footprint.altitude_m,
            modality: 'RGB',
          },
        });

        if (this.stitchedSwaths.length > this.maxStitchedSwaths) {
          this.stitchedSwaths.shift();
        }

        this.lastDronePositions.set(drone.drone_id, {
          lat: drone.latitude,
          lon: drone.longitude,
          time: now,
        });
      }
    });

    // Update Frustum Source
    const frustumSource = this.map.getSource(this.liveFrustumSourceId) as maplibregl.GeoJSONSource;
    if (frustumSource) {
      frustumSource.setData({
        type: 'FeatureCollection',
        features: frustumFeatures,
      });
    }

    // Update Stitched Swaths Source (The Progressively Drawn Map)
    const swathSource = this.map.getSource(this.stitchedSwathSourceId) as maplibregl.GeoJSONSource;
    if (swathSource) {
      swathSource.setData({
        type: 'FeatureCollection',
        features: this.stitchedSwaths,
      });
    }
  }

  /**
   * Projects an actual video frame (base64 image) onto the MapLibre ground plane.
   */
  public projectVideoFrame(frame: CameraFrameData, lat: number, lon: number, alt: number, heading: number): void {
    if (!this.map || !this.map.isStyleLoaded() || !frame.image_b64) return;

    const sourceId = `video-ground-${frame.drone_id}-${frame.stream_type}`;
    const layerId = `video-ground-layer-${frame.drone_id}-${frame.stream_type}`;

    const fp = this.calculateGroundFootprint(lat, lon, alt, heading);
    const coordinates: [[number, number], [number, number], [number, number], [number, number]] = [
      fp.top_left,
      fp.top_right,
      fp.bottom_right,
      fp.bottom_left,
    ];

    try {
      const existingSource = this.map.getSource(sourceId) as maplibregl.ImageSource;
      if (existingSource && typeof existingSource.updateImage === 'function') {
        existingSource.updateImage({
          url: frame.image_b64,
          coordinates,
        });
      } else if (!existingSource) {
        this.map.addSource(sourceId, {
          type: 'image',
          url: frame.image_b64,
          coordinates,
        });

        this.map.addLayer(
          {
            id: layerId,
            type: 'raster',
            source: sourceId,
            paint: {
              'raster-opacity': 0.88,
              'raster-fade-duration': 0,
            },
          },
          this.liveFrustumFillLayerId // Insert beneath active laser/outline
        );
      }
    } catch (e) {
      // Image source update throttle fallback
    }
  }

  /**
   * Rebuilds high-contrast tactical metric coordinate grid ticks centered on home/origin.
   */
  public rebuildTacticalGrid(centerLat = 37.774929, centerLon = -122.419416): void {
    if (!this.map || !this.map.isStyleLoaded()) return;

    const gridFeatures: GeoJSON.Feature[] = [];
    const stepDeg = 0.001; // ~111m grid
    const extent = 0.020;  // ~2.2km extent

    for (let dlat = -extent; dlat <= extent; dlat += stepDeg) {
      const glat = centerLat + dlat;
      gridFeatures.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [centerLon - extent, glat],
            [centerLon + extent, glat],
          ],
        },
        properties: { type: 'grid_lat' },
      });
    }

    for (let dlon = -extent; dlon <= extent; dlon += stepDeg) {
      const glon = centerLon + dlon;
      gridFeatures.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [glon, centerLat - extent],
            [glon, centerLat + extent],
          ],
        },
        properties: { type: 'grid_lon' },
      });
    }

    const gridSource = this.map.getSource(this.tacticalGridSourceId) as maplibregl.GeoJSONSource;
    if (gridSource) {
      gridSource.setData({
        type: 'FeatureCollection',
        features: gridFeatures,
      });
    }
  }

  private startLaserAnimation(): void {
    let lastTime = performance.now();
    const animate = (time: number) => {
      const dt = (time - lastTime) / 1000.0;
      lastTime = time;

      this.laserPhase = (this.laserPhase + dt * 0.8) % 1.0;

      if (this.lastFleetState && this.map && this.map.isStyleLoaded()) {
        this.updateFleetVideoProjections(this.lastFleetState);
      }

      this.animFrameId = requestAnimationFrame(animate);
    };

    this.animFrameId = requestAnimationFrame(animate);
  }

  public clear(): void {
    this.stitchedSwaths = [];
    this.lastDronePositions.clear();
    if (!this.map || !this.map.isStyleLoaded()) return;

    const swathSource = this.map.getSource(this.stitchedSwathSourceId) as maplibregl.GeoJSONSource;
    if (swathSource) {
      swathSource.setData({ type: 'FeatureCollection', features: [] });
    }

    const frustumSource = this.map.getSource(this.liveFrustumSourceId) as maplibregl.GeoJSONSource;
    if (frustumSource) {
      frustumSource.setData({ type: 'FeatureCollection', features: [] });
    }
  }
}

function roundNum(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}
