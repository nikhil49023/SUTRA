import React, { useEffect, useRef } from 'react';
import { mapPersistence } from './MapPersistence';
import { mapController } from './MapController';
import { useMissionStore } from '../stores/missionStore';
import { useFleetStore } from '../stores/fleetStore';
import { useGeofenceStore } from '../stores/geofenceStore';
import { useGISStore } from '../stores/gisStore';
import { useSelectionStore } from '../stores/selectionStore';
import { useMapStore } from '../stores/mapStore';
import { MapInteractionToolbox } from './MapInteractionToolbox';
import { GeofenceToolbar } from '../geofence/GeofenceToolbar';
import { ZoomIn, ZoomOut, Compass, Navigation, MapPin } from 'lucide-react';

export const MapView: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const missionState = useMissionStore();
  const fleetState = useFleetStore();
  const geofenceState = useGeofenceStore();
  const gisState = useGISStore();
  const { selected_type, selected_id } = useSelectionStore();
  const { interactionMode, previewWaypoint } = useMapStore();

  const syncAllLayers = () => {
    mapController.routeLayer.updateRoute(
      missionState.waypoints,
      missionState.home_latitude,
      missionState.home_longitude
    );
    mapController.waypointLayer.renderWaypoints(
      missionState.waypoints,
      missionState.active_waypoint_index,
      selected_type === 'WAYPOINT' ? selected_id : null
    );
    mapController.geofenceLayer.updateGeofences(
      geofenceState.geofences,
      selected_type === 'GEOFENCE' ? selected_id : null
    );
    mapController.fleetLayer.updateFleet(
      fleetState.drones,
      selected_type === 'DRONE' ? selected_id : null
    );
    mapController.formationLayer.updateFormation(fleetState);
    mapController.gisLayer.updateGis(gisState);
  };

  // Initialize Map exactly once
  useEffect(() => {
    if (mapContainerRef.current) {
      const map = mapPersistence.initOrAttach(mapContainerRef.current, () => {
        mapController.attachMap(map);
        syncAllLayers();
      });
      mapController.attachMap(map);
      if (map.isStyleLoaded()) {
        syncAllLayers();
      }
    }
  }, []);

  // Update Mission & Waypoint layers
  useEffect(() => {
    mapController.routeLayer.updateRoute(
      missionState.waypoints,
      missionState.home_latitude,
      missionState.home_longitude
    );
    mapController.waypointLayer.renderWaypoints(
      missionState.waypoints,
      missionState.active_waypoint_index,
      selected_type === 'WAYPOINT' ? selected_id : null
    );
  }, [missionState.waypoints, missionState.active_waypoint_index, selected_type, selected_id]);

  // Fit route trigger
  useEffect(() => {
    if (missionState.fitRouteTrigger > 0) {
      mapController.fitRoute(missionState.waypoints);
    }
  }, [missionState.fitRouteTrigger]);

  // Update Geofence Layer
  useEffect(() => {
    mapController.geofenceLayer.updateGeofences(
      geofenceState.geofences,
      selected_type === 'GEOFENCE' ? selected_id : null
    );
  }, [geofenceState.geofences, selected_type, selected_id]);

  // Update Geofence Drawing Preview
  useEffect(() => {
    if (geofenceState.drawing_mode) {
      mapController.geofenceLayer.updateDrawingSession(
        geofenceState.drawing_points,
        geofenceState.preview_point
      );
    } else {
      mapController.geofenceLayer.updateDrawingSession([]);
    }
  }, [geofenceState.drawing_mode, geofenceState.drawing_points, geofenceState.preview_point]);

  // Update Fleet Layer
  useEffect(() => {
    mapController.fleetLayer.updateFleet(
      fleetState.drones,
      selected_type === 'DRONE' ? selected_id : null
    );
    mapController.formationLayer.updateFormation(fleetState);
  }, [
    fleetState.drones,
    fleetState.formation,
    fleetState.spacing,
    fleetState.show_guides,
    selected_type,
    selected_id,
  ]);

  // Update GIS Layer
  useEffect(() => {
    mapController.gisLayer.updateGis(gisState);
  }, [gisState]);

  // Map controls
  const handleZoomIn = () => mapPersistence.getMap()?.zoomIn();
  const handleZoomOut = () => mapPersistence.getMap()?.zoomOut();
  const handleResetBearing = () => mapPersistence.getMap()?.resetNorthPitch();
  const handleCenterFleet = () => {
    const leader = fleetState.leader_id ? fleetState.drones[fleetState.leader_id] : null;
    if (leader) {
      mapController.centerOnCoordinates(leader.latitude, leader.longitude);
    }
  };

  const isDrawingGeofence = interactionMode === 'DRAW_GEOFENCE' || geofenceState.drawing_mode;
  const isAddingWaypoint = interactionMode === 'ADD_WAYPOINT';

  return (
    <div className={`relative w-full h-full overflow-hidden bg-[#0a0d12] ${isAddingWaypoint || isDrawingGeofence ? 'cursor-crosshair' : ''}`}>
      {/* Persistent Map Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* ADD_WAYPOINT Banner — top center, prominent */}
      {isAddingWaypoint && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-950/95 border border-cyan-400/70 shadow-[0_0_20px_rgba(0,229,255,0.3)] backdrop-blur-md">
          <MapPin className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="text-cyan-300 text-[12px] font-mono font-bold tracking-wide">
            CLICK MAP TO PLACE WAYPOINT
          </span>
          <span className="text-slate-400 text-[11px] font-mono ml-1">(ESC to cancel)</span>
        </div>
      )}

      {/* GEOFENCE_DRAWING Toolbar & Status — top center, floating */}
      {isDrawingGeofence && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 shadow-2xl backdrop-blur-md">
          <GeofenceToolbar />
        </div>
      )}

      {/* Floating Left Toolbox — Map Interaction Mode Selector */}
      <div className="absolute top-4 left-4 z-10">
        <MapInteractionToolbox />
      </div>

      {/* Floating Right Controls — Zoom / Bearing / Center */}
      <div className="absolute top-4 right-4 flex flex-col space-y-2 z-10">
        <div className="flex flex-col rounded border border-slate-800 bg-[#0f141c]/90 backdrop-blur-md shadow-xl overflow-hidden">
          <button
            onClick={handleZoomIn}
            className="p-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800/60 transition"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="h-px bg-slate-800" />
          <button
            onClick={handleZoomOut}
            className="p-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800/60 transition"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="h-px bg-slate-800" />
          <button
            onClick={handleResetBearing}
            className="p-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800/60 transition"
            title="Reset North & 2D"
          >
            <Compass className="w-4 h-4" />
          </button>
          <div className="h-px bg-slate-800" />
          <button
            onClick={handleCenterFleet}
            className="p-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800/60 transition"
            title="Center on Fleet Leader"
          >
            <Navigation className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* Map Mode Indicator Bottom Left */}
      <div className="absolute bottom-2 left-2 z-10 px-2.5 py-1 rounded bg-[#0f141c]/80 border border-slate-800/80 backdrop-blur text-[11px] font-mono text-slate-400 flex items-center space-x-3">
        <span>MAPLIBRE GL PERSISTENT</span>
        <span>•</span>
        <span className={interactionMode !== 'SELECT' ? 'text-cyan-400 font-bold' : 'text-cyan-400'}>
          {interactionMode}
        </span>
        <span>•</span>
        <span>
          HOME: {missionState.home_latitude.toFixed(5)}°, {missionState.home_longitude.toFixed(5)}°
        </span>
      </div>
    </div>
  );
};
