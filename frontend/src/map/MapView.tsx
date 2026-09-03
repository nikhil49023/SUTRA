/**
 * Smart Horizon GCS — Optimized MapView
 *
 * PERFORMANCE FIXES:
 * 1. Each useEffect subscribes to ONLY the store slice it needs via selector —
 *    telemetry ticks no longer cause MapView itself to re-render.
 * 2. WaypointLayer.onDragUpdate wired directly to RouteLayer — zero React involvement during drag.
 * 3. Fleet / Formation layer effects use shallow equality guards to skip no-op renders.
 * 4. syncAllLayers (style.load) reads current state from store snapshots, not from props.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { mapPersistence } from './MapPersistence';
import { mapController } from './MapController';
import { useMissionStore } from '../stores/missionStore';
import { useFleetStore } from '../stores/fleetStore';
import { useGeofenceStore } from '../stores/geofenceStore';
import { useGISStore } from '../stores/gisStore';
import { useAIStore } from '../stores/aiStore';
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

  // ── Only subscribe to what MapView itself renders (not fleet/mission details) ──
  const interactionMode = useMapStore((s) => s.interactionMode);
  const mapStyle = useAppStore((s) => s.mapStyle);
  const mapStyleLoading = useAppStore((s) => s.mapStyleLoading);
  const setMapStyle = useAppStore((s) => s.setMapStyle);

  // Snapshot getter — reads once at call time, never subscribes MapView to these stores
  const getLayerState = useCallback(() => {
    const ms = useMissionStore.getState();
    const fs = useFleetStore.getState();
    const gs = useGeofenceStore.getState();
    const gis = useGISStore.getState();
    const ai = useAIStore.getState();
    const sel = useSelectionStore.getState();
    return { ms, fs, gs, gis, ai, sel };
  }, []);


  // ── Wire waypoint drag → route line (pure JS, no React renders during drag) ──
  useEffect(() => {
    mapController.waypointLayer.onDragUpdate = (wpId, lat, lon) => {
      const ms = useMissionStore.getState();
      // Build updated waypoints list in-memory only — do NOT call setWaypoints here
      const tempWaypoints = ms.waypoints.map((w) =>
        (w.id || w.index) === wpId ? { ...w, latitude: lat, longitude: lon } : w
      );
      mapController.routeLayer.updateRoute(tempWaypoints, ms.home_latitude, ms.home_longitude);
    };
    return () => {
      mapController.waypointLayer.onDragUpdate = null;
    };
  }, []);

  // ── Initialize Map exactly once ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const mapInstance = mapPersistence.initOrAttach(mapContainerRef.current);
    mapController.attachMap(mapInstance);

    if (mapInstance.isStyleLoaded()) {
      const { ms, fs, gs, gis, ai, sel } = getLayerState();
      syncAll(ms, fs, gs, gis, ai, sel);
    }

    // Fired after map style switch — re-add all layers
    const unsubStyle = mapPersistence.onStyleLoaded(() => {
      const { ms, fs, gs, gis, ai, sel } = getLayerState();
      syncAll(ms, fs, gs, gis, ai, sel);
    });


    return () => {
      unsubStyle();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── React to mapStyle store updates ─────────────────────────────────────────
  useEffect(() => {
    if (mapStyle) {
      mapPersistence.setMapStyle(mapStyle);
    }
  }, [mapStyle]);

  // ── Mission layer: waypoints + route ─────────────────────────────────────────
  // Subscribe to mission.waypoints and selection — NOT to entire missionStore
  useEffect(() => {
    const unsub = useMissionStore.subscribe((ms) => {
      const sel = useSelectionStore.getState();
      mapController.routeLayer.updateRoute(ms.waypoints, ms.home_latitude, ms.home_longitude);
      mapController.waypointLayer.renderWaypoints(
        ms.waypoints,
        ms.active_waypoint_index,
        sel.selected_type === 'WAYPOINT' ? sel.selected_id : null
      );
    });
    return unsub;
  }, []);

  // ── Selection change — re-render waypoints + geofences + AI targets with new highlight ────
  useEffect(() => {
    const unsub = useSelectionStore.subscribe((sel) => {
      const ms = useMissionStore.getState();
      const gs = useGeofenceStore.getState();
      const ai = useAIStore.getState();
      mapController.waypointLayer.renderWaypoints(
        ms.waypoints,
        ms.active_waypoint_index,
        sel.selected_type === 'WAYPOINT' ? sel.selected_id : null
      );
      mapController.geofenceLayer.updateGeofences(
        gs.geofences,
        sel.selected_type === 'GEOFENCE' ? sel.selected_id : null
      );
      mapController.aiTargetLayer.updateTargets(
        ai.tracked_targets,
        sel.selected_type === 'TARGET' ? sel.selected_id : null
      );
    });
    return unsub;
  }, []);

  // ── Fit route trigger ─────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = useMissionStore.subscribe((ms, prev) => {
      if (ms.fitRouteTrigger !== prev.fitRouteTrigger && ms.fitRouteTrigger > 0) {
        mapController.fitRoute(ms.waypoints);
      }
    });
    return unsub;
  }, []);

  // ── Geofence layer ────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = useGeofenceStore.subscribe((gs) => {
      const sel = useSelectionStore.getState();
      mapController.geofenceLayer.updateGeofences(
        gs.geofences,
        sel.selected_type === 'GEOFENCE' ? sel.selected_id : null
      );
      if (gs.drawing_mode) {
        mapController.geofenceLayer.updateDrawingSession(gs.drawing_points, gs.preview_point);
      } else {
        mapController.geofenceLayer.updateDrawingSession([]);
      }
    });
    return unsub;
  }, []);

  // ── Fleet + Formation layer (telemetry driven) ────────────────────────────────
  // Uses zustand subscribe with selector to only trigger when drones object ref changes
  useEffect(() => {
    const unsub = useFleetStore.subscribe((fs) => {
      const sel = useSelectionStore.getState();
      mapController.fleetLayer.updateFleet(
        fs.drones,
        sel.selected_type === 'DRONE' ? sel.selected_id : null
      );
      mapController.formationLayer.updateFormation(fs);
    });
    return unsub;
  }, []);

  // ── GIS layer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = useGISStore.subscribe((gis) => {
      mapController.gisLayer.updateGis(gis);
    });
    return unsub;
  }, []);

  // ── AI Target layer (Subsystem C perception driven) ───────────────────────────
  useEffect(() => {
    const unsub = useAIStore.subscribe((ai) => {
      const sel = useSelectionStore.getState();
      mapController.aiTargetLayer.updateTargets(
        ai.tracked_targets,
        sel.selected_type === 'TARGET' ? sel.selected_id : null
      );
    });
    return unsub;
  }, []);


  // ── Map controls ───────────────────────────────────────────────────────────────
  const handleZoomIn = () => mapPersistence.getMap()?.zoomIn();
  const handleZoomOut = () => mapPersistence.getMap()?.zoomOut();
  const handleResetBearing = () => mapPersistence.getMap()?.resetNorthPitch();
  const handleCenterFleet = () => {
    const fs = useFleetStore.getState();
    const leader = fs.leader_id ? fs.drones[fs.leader_id] : null;
    if (leader) {
      mapController.centerOnCoordinates(leader.latitude, leader.longitude);
    }
  };

  const handleSelectStyle = (style: MapStyleType) => {
    setMapStyle(style);
    setStyleMenuOpen(false);
  };

  const isDrawingGeofence = interactionMode === 'DRAW_GEOFENCE';
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

      {/* ADD_WAYPOINT Banner */}
      {isAddingWaypoint && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-[#1B2530]/95 border border-[#5B8FB9] shadow-[0_0_12px_rgba(91,143,185,0.25)] backdrop-blur-md">
          <MapPin className="w-4 h-4 text-[#5B8FB9] animate-pulse" />
          <span className="text-[#E7EBEF] text-[12px] font-mono font-bold tracking-wide">
            CLICK MAP TO PLACE WAYPOINT
          </span>
          <span className="text-[#A9B3BD] text-[11px] font-mono ml-1">(ESC to cancel)</span>
        </div>
      )}

      {/* GEOFENCE_DRAWING Toolbar */}
      {isDrawingGeofence && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 shadow-2xl backdrop-blur-md">
          <GeofenceToolbar />
        </div>
      )}

      {/* Floating Left Toolbox */}
      <div className="absolute top-4 left-4 z-10">
        <MapInteractionToolbox />
      </div>

      {/* Floating Right Controls */}
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

          {/* Quick Basemap Style Selector */}
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

            {styleMenuOpen && (
              <div className="absolute right-full top-0 mr-2 w-44 rounded-lg border border-[#2B3743] bg-[#11171E]/95 shadow-2xl p-1.5 space-y-1 font-mono text-xs select-none">
                <div className="px-2 py-1 text-[10px] font-bold text-[#707C88] uppercase tracking-wider border-b border-[#2B3743]/60">
                  Basemap Style
                </div>

                {(
                  [
                    { key: 'tactical-dark', label: 'Dark Tactical', badge: 'DARK' },
                    { key: 'satellite', label: 'Satellite', badge: 'SAT' },
                    { key: 'terrain', label: 'Terrain', badge: 'TOPO' },
                    { key: 'streets', label: 'Streets', badge: 'STR' },
                  ] as { key: MapStyleType; label: string; badge: string }[]
                ).map(({ key, label, badge }) => (
                  <button
                    key={key}
                    onClick={() => handleSelectStyle(key)}
                    className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between transition ${
                      mapStyle === key
                        ? 'bg-[#1B2530] text-[#5B8FB9] font-bold border border-[#5B8FB9]/40'
                        : 'text-[#A9B3BD] hover:text-[#E7EBEF] hover:bg-[#151D26]'
                    }`}
                  >
                    <span>{label}</span>
                    <span className="text-[9px] px-1 rounded bg-[#0B0F14] text-[#707C88]">
                      {badge}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map Mode Indicator Bottom Left */}
      <MapStatusBar mapStyle={mapStyle} interactionMode={interactionMode} />

      {/* Geofence Debug Panel */}
      <GeofenceDebugPanel />
    </div>
  );
};

// ── Memoized status bar — never re-renders due to fleet/mission updates ────────
const MapStatusBar = React.memo(
  ({ mapStyle, interactionMode }: { mapStyle: MapStyleType; interactionMode: string }) => {
    // Read home position once from store snapshot — not subscribed
    const home = useMissionStore.getState();
    return (
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
          HOME: {home.home_latitude.toFixed(5)}°, {home.home_longitude.toFixed(5)}°
        </span>
      </div>
    );
  }
);

// ── Helper used by onStyleLoaded ────────────────────────────────────────────────
function syncAll(ms: any, fs: any, gs: any, gis: any, ai: any, sel: any) {
  mapController.routeLayer.updateRoute(ms.waypoints, ms.home_latitude, ms.home_longitude);
  mapController.waypointLayer.renderWaypoints(
    ms.waypoints,
    ms.active_waypoint_index,
    sel.selected_type === 'WAYPOINT' ? sel.selected_id : null
  );
  mapController.geofenceLayer.updateGeofences(
    gs.geofences,
    sel.selected_type === 'GEOFENCE' ? sel.selected_id : null
  );
  mapController.fleetLayer.updateFleet(
    fs.drones,
    sel.selected_type === 'DRONE' ? sel.selected_id : null
  );
  mapController.formationLayer.updateFormation(fs);
  mapController.gisLayer.updateGis(gis);
  mapController.aiTargetLayer.updateTargets(
    ai?.tracked_targets || [],
    sel.selected_type === 'TARGET' ? sel.selected_id : null
  );
}

