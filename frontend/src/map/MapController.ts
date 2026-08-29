/**
 * Smart Horizon GCS — Central Master Map Controller
 *
 * PERFORMANCE FIXES:
 * 1. mousemove geofence preview: RAF-throttled — writes only once per animation frame.
 * 2. setupInteractions called once; click/mousemove handlers read store snapshots,
 *    never subscribe, so they don't participate in React render cycles.
 */

import maplibregl from 'maplibre-gl';
import { WaypointLayer } from './WaypointLayer';
import { RouteLayer } from './RouteLayer';
import { GeofenceLayer } from './GeofenceLayer';
import { FleetLayer } from './FleetLayer';
import { FormationLayer } from './FormationLayer';
import { GisLayer } from './GisLayer';
import { commandManager } from '../communication/CommandManager';
import { useMapStore } from '../stores/mapStore';
import { useGeofenceStore } from '../stores/geofenceStore';
import { useSelectionStore } from '../stores/selectionStore';
import { rafThrottle } from '../utils/performance';

export class MapController {
  public waypointLayer = new WaypointLayer();
  public routeLayer = new RouteLayer();
  public geofenceLayer = new GeofenceLayer();
  public fleetLayer = new FleetLayer();
  public formationLayer = new FormationLayer();
  public gisLayer = new GisLayer();
  private map: maplibregl.Map | null = null;

  // RAF-throttled geofence preview update — at most 1 Zustand write per frame
  private rafUpdatePreview = rafThrottle((lat: number, lng: number) => {
    useGeofenceStore.getState().updatePreviewPoint(lat, lng);
  });

  public attachMap(map: maplibregl.Map): void {
    this.map = map;
    this.waypointLayer.setMap(map);
    this.routeLayer.setMap(map);
    this.geofenceLayer.setMap(map);
    this.fleetLayer.setMap(map);
    this.formationLayer.setMap(map);
    this.gisLayer.setMap(map);

    this.setupInteractions();
  }

  public fitRoute(waypoints: { latitude: number; longitude: number }[]): void {
    if (!this.map || waypoints.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();
    waypoints.forEach((wp) => bounds.extend([wp.longitude, wp.latitude]));

    this.map.fitBounds(bounds, {
      padding: { top: 80, bottom: 80, left: 80, right: 80 },
      maxZoom: 17,
      duration: 1000,
    });
  }

  public centerOnCoordinates(lat: number, lon: number, zoom = 16): void {
    if (!this.map) return;
    this.map.flyTo({
      center: [lon, lat],
      zoom,
      duration: 800,
    });
  }

  private setupInteractions(): void {
    if (!this.map) return;

    // Map Click Handler
    this.map.on('click', (e) => {
      const { lat, lng } = e.lngLat;
      const mapStore = useMapStore.getState();
      const geofenceState = useGeofenceStore.getState();

      mapStore.setLastMapClick(lat, lng);

      if (mapStore.interactionMode === 'ADD_WAYPOINT') {
        mapStore.setPreviewWaypoint({ latitude: lat, longitude: lng, altitude: 25.0, speed: 6.0 });
        mapStore.setLastWaypointCommandStatus('SENT');

        commandManager.sendCommand('mission.add_waypoint', {
          latitude: lat,
          longitude: lng,
          altitude: 25.0,
          speed: 6.0,
        }, {
          onAck: () => {
            useMapStore.getState().setLastWaypointCommandStatus('SUCCESS');
            useMapStore.getState().setPreviewWaypoint(null);
            useMapStore.getState().setInteractionMode('SELECT');
          },
          onRollback: () => {
            useMapStore.getState().setLastWaypointCommandStatus('FAILED');
            useMapStore.getState().setPreviewWaypoint(null);
          },
        });
        return;
      }

      if (mapStore.interactionMode === 'DRAW_GEOFENCE' || geofenceState.drawing_mode) {
        if (!geofenceState.drawing_mode) {
          geofenceState.startDrawing(
            geofenceState.active_zone_type || 'NO_FLY',
            geofenceState.active_geometry_type || 'POLYGON'
          );
          commandManager.sendCommand('geofence.start_drawing', {
            zone_type: geofenceState.active_zone_type || 'NO_FLY',
            geometry_type: geofenceState.active_geometry_type || 'POLYGON',
          });
        }
        geofenceState.addDrawingPoint(lat, lng);
        commandManager.sendCommand('geofence.add_point', { latitude: lat, longitude: lng });
        return;
      }

      if (mapStore.interactionMode === 'SELECT' && !geofenceState.drawing_mode && this.map) {
        const map = this.map;
        const checkLayers = ['geofences-fill', 'waypoints-layer'].filter((l) => map.getLayer(l));
        const rendered = checkLayers.length > 0 ? map.queryRenderedFeatures(e.point, { layers: checkLayers }) : [];
        if (!rendered || rendered.length === 0) {
          useSelectionStore.getState().clearSelection();
          this.geofenceLayer.clearHandles();
        }
      }
    });

    // Mousemove: geofence rubberband preview — RAF-throttled, at most 1 store write/frame
    this.map.on('mousemove', (e) => {
      const mapStore = useMapStore.getState();
      const { drawing_mode } = useGeofenceStore.getState();
      if (drawing_mode || mapStore.interactionMode === 'DRAW_GEOFENCE') {
        this.rafUpdatePreview(e.lngLat.lat, e.lngLat.lng);
      }
    });
  }
}

export const mapController = new MapController();
