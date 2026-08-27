import React, { useEffect, useRef, useState } from 'react';
import { mapPersistence } from './MapPersistence';
import { mapController } from './MapController';
import { useMissionStore } from '../stores/missionStore';
import { useFleetStore } from '../stores/fleetStore';
import { useGeofenceStore } from '../stores/geofenceStore';
import { useGISStore } from '../stores/gisStore';
import { useSelectionStore } from '../stores/selectionStore';
import { useMapStore } from '../stores/mapStore';
import { useAppStore } from '../stores/appStore';
import { MapInteractionToolbox } from './MapInteractionToolbox';
import { GeofenceToolbar } from '../geofence/GeofenceToolbar';
import { GeofenceDebugPanel } from '../geofence/GeofenceDebugPanel';
import { MAP_STYLE_LABELS } from './MapStyles';
import { MapStyleType } from '../types/app';
import {
  ZoomIn,
  ZoomOut,
  Compass,
  Navigation,
  MapPin,
  Layers,
  RefreshCw,
} from 'lucide-react';

export const MapView: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [styleMenuOpen, setStyleMenuOpen] = useState(false);

  const missionState = useMissionStore();
  const fleetState = useFleetStore();
  const geofenceState = useGeofenceStore();
  const gisState = useGISStore();
  const { selected_type, selected_id } = useSelectionStore();
  const { interactionMode, previewWaypoint } = useMapStore();
  const { mapStyle, mapStyleLoading, setMapStyle } = useAppStore();

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
      const mapInstance = mapPersistence.initOrAttach(mapContainerRef.current);
      mapController.attachMap(mapInstance);
      if (mapInstance.isStyleLoaded()) {
        syncAllLayers();
      }
    }

    // Subscribe to style reload events
    const unsubscribe = mapPersistence.onStyleLoaded(() => {
      syncAllLayers();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // React to mapStyle store updates
  useEffect(() => {
    if (mapStyle) {
      mapPersistence.setMapStyle(mapStyle);
    }
  }, [mapStyle]);

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

  const handleSelectStyle = (style: MapStyleType) => {
    setMapStyle(style);
    setStyleMenuOpen(false);
  };

  const isDrawingGeofence = interactionMode === 'DRAW_GEOFENCE' || geofenceState.drawing_mode;
  const isAddingWaypoint = interactionMode === 'ADD_WAYPOINT';

  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-[#0B0F14] ${
        isAddingWaypoint || isDrawingGeofence ? 'cursor-crosshair' : ''
      }`}
    >
      {/* Persistent Map Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Map Style Loading Spinner Overlay */}
      {mapStyleLoading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#11171E]/95 border border-[#5B8FB9] text-[#5B8FB9] font-mono text-xs shadow-xl backdrop-blur-md animate-pulse">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>SWITCHING TO {MAP_STYLE_LABELS[mapStyle]?.badge || 'MAP'} TILES...</span>
        </div>
      )}

      {/* ADD_WAYPOINT Banner — top center, prominent */}
      {isAddingWaypoint && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-[#1B2530]/95 border border-[#5B8FB9] shadow-[0_0_12px_rgba(91,143,185,0.25)] backdrop-blur-md">
          <MapPin className="w-4 h-4 text-[#5B8FB9] animate-pulse" />
          <span className="text-[#E7EBEF] text-[12px] font-mono font-bold tracking-wide">
            CLICK MAP TO PLACE WAYPOINT
          </span>
          <span className="text-[#A9B3BD] text-[11px] font-mono ml-1">(ESC to cancel)</span>
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

      {/* Floating Right Controls — Zoom / Bearing / Center / Basemap Styles */}
      <div className="absolute top-4 right-4 flex flex-col space-y-2 z-10">
        <div className="flex flex-col rounded border border-[#2B3743] bg-[#11171E]/95 backdrop-blur-md shadow-xl overflow-hidden">
          <button
            onClick={handleZoomIn}
            className="p-2 text-[#A9B3BD] hover:text-[#E7EBEF] hover:bg-[#151D26] transition"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="h-px bg-[#2B3743]" />
          <button
            onClick={handleZoomOut}
            className="p-2 text-[#A9B3BD] hover:text-[#E7EBEF] hover:bg-[#151D26] transition"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="h-px bg-[#2B3743]" />
          <button
            onClick={handleResetBearing}
            className="p-2 text-[#A9B3BD] hover:text-[#E7EBEF] hover:bg-[#151D26] transition"
            title="Reset North & 2D"
          >
            <Compass className="w-4 h-4" />
          </button>
          <div className="h-px bg-[#2B3743]" />
          <button
            onClick={handleCenterFleet}
            className="p-2 text-[#A9B3BD] hover:text-[#E7EBEF] hover:bg-[#151D26] transition"
            title="Center on Fleet Leader"
          >
            <Navigation className="w-4 h-4 text-[#4F9A72]" />
          </button>
          <div className="h-px bg-[#2B3743]" />

          {/* Quick Basemap Style Selector Toggle */}
          <div className="relative">
            <button
              onClick={() => setStyleMenuOpen((prev) => !prev)}
              className={`p-2 transition flex items-center justify-center ${
                styleMenuOpen || mapStyle === 'satellite'
                  ? 'text-[#5B8FB9] bg-[#1B2530]'
                  : 'text-[#A9B3BD] hover:text-[#E7EBEF] hover:bg-[#151D26]'
              }`}
              title={`Basemap: ${MAP_STYLE_LABELS[mapStyle]?.label || mapStyle}`}
            >
              <Layers className="w-4 h-4" />
            </button>

            {/* Floating Basemap Style Menu */}
            {styleMenuOpen && (
              <div className="absolute right-full top-0 mr-2 w-44 rounded-lg border border-[#2B3743] bg-[#11171E]/95 backdrop-blur-md shadow-2xl p-1.5 space-y-1 font-mono text-xs select-none">
                <div className="px-2 py-1 text-[10px] font-bold text-[#707C88] uppercase tracking-wider border-b border-[#2B3743]/60">
                  Basemap Style
                </div>

                <button
                  onClick={() => handleSelectStyle('tactical-dark')}
                  className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between transition ${
                    mapStyle === 'tactical-dark'
                      ? 'bg-[#1B2530] text-[#5B8FB9] font-bold border border-[#5B8FB9]/40'
                      : 'text-[#A9B3BD] hover:text-[#E7EBEF] hover:bg-[#151D26]'
                  }`}
                >
                  <span>Dark Tactical</span>
                  <span className="text-[9px] px-1 rounded bg-[#0B0F14] text-[#707C88]">DARK</span>
                </button>

                <button
                  onClick={() => handleSelectStyle('satellite')}
                  className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between transition ${
                    mapStyle === 'satellite'
                      ? 'bg-[#1B2530] text-[#5B8FB9] font-bold border border-[#5B8FB9]/40'
                      : 'text-[#A9B3BD] hover:text-[#E7EBEF] hover:bg-[#151D26]'
                  }`}
                >
                  <span>Satellite</span>
                  <span className="text-[9px] px-1 rounded bg-[#0B0F14] text-[#4F9A72] font-bold">SAT</span>
                </button>

                <button
                  onClick={() => handleSelectStyle('terrain')}
                  className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between transition ${
                    mapStyle === 'terrain'
                      ? 'bg-[#1B2530] text-[#5B8FB9] font-bold border border-[#5B8FB9]/40'
                      : 'text-[#A9B3BD] hover:text-[#E7EBEF] hover:bg-[#151D26]'
                  }`}
                >
                  <span>Terrain</span>
                  <span className="text-[9px] px-1 rounded bg-[#0B0F14] text-[#C49A4A]">TOPO</span>
                </button>

                <button
                  onClick={() => handleSelectStyle('streets')}
                  className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between transition ${
                    mapStyle === 'streets'
                      ? 'bg-[#1B2530] text-[#5B8FB9] font-bold border border-[#5B8FB9]/40'
                      : 'text-[#A9B3BD] hover:text-[#E7EBEF] hover:bg-[#151D26]'
                  }`}
                >
                  <span>Streets</span>
                  <span className="text-[9px] px-1 rounded bg-[#0B0F14] text-[#707C88]">STR</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map Mode Indicator Bottom Left */}
      <div className="absolute bottom-2 left-2 z-10 px-2.5 py-1 rounded bg-[#11171E]/90 border border-[#2B3743] backdrop-blur text-[11px] font-mono text-[#707C88] flex items-center space-x-3">
        <span>MAPLIBRE GL PERSISTENT</span>
        <span>•</span>
        <span className="text-[#5B8FB9] font-bold uppercase">
          {MAP_STYLE_LABELS[mapStyle]?.badge || mapStyle}
        </span>
        <span>•</span>
        <span className="text-[#5B8FB9] font-bold">{interactionMode}</span>
        <span>•</span>
        <span>
          HOME: {missionState.home_latitude.toFixed(5)}°, {missionState.home_longitude.toFixed(5)}°
        </span>
      </div>

      {/* Geofence Debug Panel — Ctrl+Shift+G to toggle */}
      <GeofenceDebugPanel />
    </div>
  );
};
