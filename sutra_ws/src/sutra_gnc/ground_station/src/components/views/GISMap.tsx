import React, { useState, useEffect } from 'react';
import { Plus, ShieldAlert, Navigation } from 'lucide-react';
import type { DroneAsset, TelemetryData, Waypoint, AIDetection } from '../../types';
import { MissionService, type MissionEstimates } from '../../services/missionService';
import { GISService } from '../../services/gisService';
import { eventBus } from '../../services/eventBus';

// GIS Modular Components
import {
  MapRenderer,
  DroneRenderer,
  WaypointRenderer,
  MissionPathRenderer,
  OverlayRenderer,
  LayerController,
  MapControls,
  MissionControlConsole,
  GeofenceManagerPanel,
  type MapStyleMode,
  type UAVMissionState,
  type GeofencePolygonData
} from './gis';

interface GISMapProps {
  activeDrone: DroneAsset;
  telemetry: TelemetryData;
  waypoints: Waypoint[];
  aiDetections: AIDetection[];
  onUpdateWaypoints: (waypoints: Waypoint[]) => void;
  onUpdateDronePos: (pos: Partial<DroneAsset>, tel: Partial<TelemetryData>) => void;
}

export type MapInteractionMode =
  | 'PAN'
  | 'ADD_WAYPOINT'
  | 'EDIT_WAYPOINT'
  | 'DRAW_GEOFENCE'
  | 'EDIT_GEOFENCE'
  | 'MEASURE_DISTANCE';

export const GISMap: React.FC<GISMapProps> = ({
  activeDrone,
  telemetry,
  waypoints,
  aiDetections,
  onUpdateWaypoints,
  onUpdateDronePos
}) => {
  const [mapStyle, setMapStyle] = useState<MapStyleMode>('TACTICAL_DARK');
  const [interactionMode, setInteractionMode] = useState<MapInteractionMode>('PAN');

  // Layer & Panel Toggles
  const [showWaypointsLayer, setShowWaypointsLayer] = useState(true);
  const [showGeofence, setShowGeofence] = useState(true);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const [showGeofencePanel, setShowGeofencePanel] = useState(false);
  const [followDrone, setFollowDrone] = useState(true);
  const [is3D, setIs3D] = useState(false);

  // Mission Control Console State Machine
  const [missionState, setMissionState] = useState<UAVMissionState>('IDLE');
  const [activeWaypointIdx, setActiveWaypointIdx] = useState(0);

  // Geofence Polygons Data
  const [geofences, setGeofences] = useState<GeofencePolygonData[]>([
    {
      id: 'GF-01',
      name: 'RESTRICTED AIRSPACE ALPHA',
      type: 'NO_FLY_ZONE',
      color: '#ff3b30',
      points: [
        [34.528, 45.102],
        [34.538, 45.118],
        [34.532, 45.138],
        [34.518, 45.122]
      ],
      minAltM: 0,
      maxAltM: 500,
      visible: true
    }
  ]);
  const [selectedGeofenceId, setSelectedGeofenceId] = useState<string | null>('GF-01');
  const [drawingGeofencePoints, setDrawingGeofencePoints] = useState<[number, number][]>([]);

  // Mission Estimates
  const estimates: MissionEstimates = MissionService.calculateMissionEstimates(waypoints);

  // Connect MissionExecutionEngine callback + Geofence Violation Checker
  useEffect(() => {
    import('../../engine/missionExecutionEngine').then(({ missionExecutionEngine }) => {
      missionExecutionEngine.setDroneUpdateCallback((pos) => {
        onUpdateDronePos(pos, {
          pitch: pos.status === 'IN_FLIGHT' ? 2.5 : 0,
          roll: pos.status === 'IN_FLIGHT' ? 1.2 : 0,
          yaw: pos.heading || 0,
          altitudeAGL: pos.altitude || 0,
          altitudeMSL: (pos.altitude || 0) + 350,
          groundSpeed: pos.groundSpeed || 0
        });

        setActiveWaypointIdx(missionExecutionEngine.getCurrentWaypointIndex());
        if (missionExecutionEngine.getState() === 'COMPLETED') {
          setMissionState('COMPLETED');
        }

        // Real-time Geofence Violation Check
        if (pos.lat && pos.lng) {
          geofences.forEach((gf) => {
            if (gf.type === 'NO_FLY_ZONE' && gf.visible) {
              const inPolygon = GISService.isPointInPolygon([pos.lat!, pos.lng!], gf.points);
              if (inPolygon) {
                eventBus.emit('SYSTEM_ALERT', {
                  title: 'GEOFENCE VIOLATION DETECTED',
                  message: `UAV penetrated No-Fly Zone: ${gf.name}. Initiating RTH protocol.`
                });
              }
            }
          });
        }
      });
    });
  }, [onUpdateDronePos, geofences]);

  // Mission State Action Handlers
  const handleArm = () => setMissionState('ARMED');
  const handleDisarm = () => setMissionState('IDLE');
  const handleTakeoff = () => setMissionState('TAKEOFF');

  const handleStartMission = async () => {
    const { missionExecutionEngine } = await import('../../engine/missionExecutionEngine');
    missionExecutionEngine.loadMission(waypoints);
    missionExecutionEngine.start();
    setMissionState('EXECUTING');
  };

  const handlePauseMission = async () => {
    const { missionExecutionEngine } = await import('../../engine/missionExecutionEngine');
    missionExecutionEngine.pause();
    setMissionState('PAUSED');
  };

  const handleResumeMission = async () => {
    const { missionExecutionEngine } = await import('../../engine/missionExecutionEngine');
    missionExecutionEngine.resume();
    setMissionState('EXECUTING');
  };

  const handleRTH = async () => {
    const { missionExecutionEngine } = await import('../../engine/missionExecutionEngine');
    missionExecutionEngine.pause();
    setMissionState('RTL');
  };

  const handleLand = async () => {
    const { missionExecutionEngine } = await import('../../engine/missionExecutionEngine');
    missionExecutionEngine.pause();
    setMissionState('LANDING');
  };

  const handleAbort = async () => {
    const { missionExecutionEngine } = await import('../../engine/missionExecutionEngine');
    missionExecutionEngine.abort();
    setMissionState('ABORTED');
  };

  const handleReset = async () => {
    const { missionExecutionEngine } = await import('../../engine/missionExecutionEngine');
    missionExecutionEngine.stop();
    setMissionState('IDLE');
    setActiveWaypointIdx(0);
  };

  // Add Waypoint or Drawing Geofence Point on Map Click
  const handleMapClick = (lngLat: { lat: number; lng: number }) => {
    if (interactionMode === 'ADD_WAYPOINT') {
      const newWp: Waypoint = {
        id: waypoints.length + 1,
        lat: lngLat.lat,
        lng: lngLat.lng,
        alt: 200,
        action: 'WAYPOINT',
        completed: false
      };
      onUpdateWaypoints([...waypoints, newWp]);
      if (missionState === 'ARMED') setMissionState('READY');
      setInteractionMode('PAN'); // Automatically exit placement mode after adding 1 waypoint
    } else if (interactionMode === 'DRAW_GEOFENCE') {
      setDrawingGeofencePoints((prev) => [...prev, [lngLat.lat, lngLat.lng]]);
    }
  };

  // Geofence Management Handlers
  const handleFinishGeofenceDrawing = () => {
    if (drawingGeofencePoints.length >= 3) {
      const newGf: GeofencePolygonData = {
        id: `GF-0${geofences.length + 1}`,
        name: `SECURITY ZONE 0${geofences.length + 1}`,
        type: 'NO_FLY_ZONE',
        color: '#ff3b30',
        points: drawingGeofencePoints,
        minAltM: 0,
        maxAltM: 500,
        visible: true
      };
      setGeofences((prev) => [...prev, newGf]);
      setDrawingGeofencePoints([]);
      setInteractionMode('PAN');
      setSelectedGeofenceId(newGf.id);
    }
  };

  const handleUpdateGeofenceVertex = (polyIdx: number, vIdx: number, newLngLat: [number, number]) => {
    setGeofences((prev) =>
      prev.map((gf, idx) => {
        if (idx !== polyIdx) return gf;
        const newPts = [...gf.points];
        newPts[vIdx] = newLngLat;
        return { ...gf, points: newPts };
      })
    );
  };

  return (
    <div className="relative w-full h-full bg-[#07090e] overflow-hidden select-none font-mono">
      {/* REAL MAPLIBRE GL MAP CONTAINER */}
      <MapRenderer
        initialCenter={[activeDrone.lng, activeDrone.lat]}
        mapStyle={mapStyle}
        onMapClick={handleMapClick}
        followDrone={followDrone}
        dronePos={[activeDrone.lng, activeDrone.lat]}
        cursorStyle={interactionMode === 'ADD_WAYPOINT' || interactionMode === 'DRAW_GEOFENCE' ? 'crosshair' : 'grab'}
      >
        {(map) => (
          <>
            <MissionPathRenderer map={map} waypoints={waypoints} activeWaypointIdx={activeWaypointIdx} />
            <OverlayRenderer
              map={map}
              geofences={geofences.filter((g) => g.visible).map((g) => g.points)}
              drawingPoints={drawingGeofencePoints}
              aiDetections={aiDetections}
              showGeofence={showGeofence}
              onUpdateGeofenceVertex={interactionMode === 'EDIT_GEOFENCE' ? handleUpdateGeofenceVertex : undefined}
            />
            {showWaypointsLayer && (
              <WaypointRenderer
                map={map}
                waypoints={waypoints}
                activeWaypointIdx={activeWaypointIdx}
                onUpdateWaypoints={onUpdateWaypoints}
                isEditable={interactionMode === 'EDIT_WAYPOINT' || interactionMode === 'PAN'}
              />
            )}
            <DroneRenderer map={map} activeDrone={activeDrone} telemetry={telemetry} />
          </>
        )}
      </MapRenderer>

      {/* TOP BAR OVERLAY */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-auto">
        <div className="flex items-center space-x-2 bg-[#090e18]/95 border border-[#1a2336] backdrop-blur-md px-3 py-1.5 rounded shadow-lg text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-slate-300 font-semibold uppercase">TACTICAL MISSION CONTROL</span>
          <span className="text-slate-600">|</span>
          <span className="text-cyan-400">LAT {activeDrone.lat.toFixed(4)} N</span>
          <span className="text-cyan-400">LON {activeDrone.lng.toFixed(4)} E</span>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-400 font-bold">{estimates.totalDistanceKm} KM ROUTE</span>
        </div>

        <div className="flex items-center space-x-1.5 bg-[#090e18]/95 border border-[#1a2336] backdrop-blur-md p-1 rounded shadow-lg">
          <button
            onClick={() => setInteractionMode('PAN')}
            className={`p-1.5 rounded text-[10px] font-mono flex items-center space-x-1 ${
              interactionMode === 'PAN' ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Pan & Navigate Map"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>PAN</span>
          </button>

          <LayerController
            mapStyle={mapStyle}
            onSelectStyle={setMapStyle}
            showWaypoints={showWaypointsLayer}
            onToggleWaypoints={setShowWaypointsLayer}
            showGeofence={showGeofence}
            onToggleGeofence={setShowGeofence}
            isOpen={isLayerMenuOpen}
            onToggleOpen={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
          />

          <button
            onClick={() => setShowGeofencePanel(!showGeofencePanel)}
            className={`p-1.5 rounded text-[10px] font-mono flex items-center space-x-1 ${
              showGeofencePanel ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>GEOFENCE</span>
          </button>

          <button
            onClick={() => setInteractionMode(interactionMode === 'ADD_WAYPOINT' ? 'PAN' : 'ADD_WAYPOINT')}
            className={`p-1.5 rounded text-[10px] font-mono flex items-center space-x-1 ${
              interactionMode === 'ADD_WAYPOINT' ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADD WP</span>
          </button>
        </div>
      </div>

      {/* TACTICAL MISSION CONTROL CONSOLE & GEOFENCE MANAGER */}
      <div className="absolute top-16 left-3 z-10 pointer-events-auto space-y-2">
        <MissionControlConsole
          missionState={missionState}
          activeDrone={activeDrone}
          telemetry={telemetry}
          waypoints={waypoints}
          activeWaypointIdx={activeWaypointIdx}
          remainingDistanceKm={estimates.totalDistanceKm}
          etaSeconds={estimates.estimatedFlightTimeMinutes * 60}
          onArm={handleArm}
          onDisarm={handleDisarm}
          onTakeoff={handleTakeoff}
          onStartMission={handleStartMission}
          onPauseMission={handlePauseMission}
          onResumeMission={handleResumeMission}
          onRTH={handleRTH}
          onLand={handleLand}
          onAbort={handleAbort}
          onReset={handleReset}
        />

        {showGeofencePanel && (
          <GeofenceManagerPanel
            geofences={geofences}
            selectedId={selectedGeofenceId}
            onSelectGeofence={setSelectedGeofenceId}
            onAddGeofence={() => setInteractionMode('DRAW_GEOFENCE')}
            onDeleteGeofence={(id) => setGeofences((prev) => prev.filter((g) => g.id !== id))}
            onToggleVisibility={(id) => setGeofences((prev) => prev.map((g) => g.id === id ? { ...g, visible: !g.visible } : g))}
            onUpdateGeofence={(id, updated) => setGeofences((prev) => prev.map((g) => g.id === id ? { ...g, ...updated } : g))}
            isDrawing={interactionMode === 'DRAW_GEOFENCE'}
            onStartDrawing={() => setInteractionMode('DRAW_GEOFENCE')}
            onFinishDrawing={handleFinishGeofenceDrawing}
            drawingPointCount={drawingGeofencePoints.length}
          />
        )}
      </div>

      {/* MAP CONTROLS */}
      <MapControls
        onZoomIn={() => {}}
        onZoomOut={() => {}}
        onResetBearing={() => {}}
        onTogglePitch={() => setIs3D(!is3D)}
        is3D={is3D}
        followDrone={followDrone}
        onToggleFollowDrone={() => setFollowDrone(!followDrone)}
      />
    </div>
  );
};
