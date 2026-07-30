import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Download,
  Compass
} from 'lucide-react';
import type { DroneAsset, TelemetryData, Waypoint, AIDetection } from '../../types';
import { MissionService, type MissionEstimates } from '../../services/missionService';

// GIS Modular Components
import {
  MapRenderer,
  DroneRenderer,
  WaypointRenderer,
  MissionPathRenderer,
  OverlayRenderer,
  LayerController,
  MapControls,
  type MapStyleMode
} from './gis';

interface GISMapProps {
  activeDrone: DroneAsset;
  telemetry: TelemetryData;
  waypoints: Waypoint[];
  aiDetections: AIDetection[];
  onUpdateWaypoints: (waypoints: Waypoint[]) => void;
  onUpdateDronePos: (pos: Partial<DroneAsset>, tel: Partial<TelemetryData>) => void;
}

export type MapInteractionMode = 'SELECT' | 'ADD_WAYPOINT' | 'DRAW_GEOFENCE';

export const GISMap: React.FC<GISMapProps> = ({
  activeDrone,
  telemetry,
  waypoints,
  aiDetections,
  onUpdateWaypoints,
  onUpdateDronePos
}) => {
  const [mapStyle, setMapStyle] = useState<MapStyleMode>('TACTICAL_DARK');
  const [interactionMode, setInteractionMode] = useState<MapInteractionMode>('SELECT');

  // Layer Toggles
  const [showWaypointsLayer, setShowWaypointsLayer] = useState(true);
  const [showGeofence, setShowGeofence] = useState(true);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const [followDrone, setFollowDrone] = useState(true);
  const [is3D, setIs3D] = useState(false);
  const [activeWaypointIdx, setActiveWaypointIdx] = useState(0);

  // Geofence Polygons
  const [geofences] = useState<[number, number][][]>([
    [
      [34.528, 45.102],
      [34.538, 45.118],
      [34.532, 45.138],
      [34.518, 45.122]
    ]
  ]);

  // Simulation State
  const [simState, setSimState] = useState({ isRunning: false, isPaused: false });

  // Mission Estimates
  const estimates: MissionEstimates = MissionService.calculateMissionEstimates(waypoints);

  // Connect MissionExecutionEngine callback
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
      });
    });
  }, [onUpdateDronePos]);

  // Simulation Control Handlers
  const handleToggleSimulation = async () => {
    const { missionExecutionEngine } = await import('../../engine/missionExecutionEngine');
    const state = missionExecutionEngine.getState();

    if (state === 'IDLE' || state === 'COMPLETED' || state === 'ABORTED') {
      missionExecutionEngine.loadMission(waypoints);
      missionExecutionEngine.start();
      setSimState({ isRunning: true, isPaused: false });
    } else if (state === 'RUNNING') {
      missionExecutionEngine.pause();
      setSimState({ isRunning: true, isPaused: true });
    } else if (state === 'PAUSED') {
      missionExecutionEngine.resume();
      setSimState({ isRunning: true, isPaused: false });
    }
  };

  const handleResetSimulation = async () => {
    const { missionExecutionEngine } = await import('../../engine/missionExecutionEngine');
    missionExecutionEngine.stop();
    setSimState({ isRunning: false, isPaused: false });
    setActiveWaypointIdx(0);
  };

  // Add Waypoint on Map Click
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
    }
  };

  // Save / Export Mission Plan
  const handleSaveMission = () => {
    const missionData = MissionService.exportMissionToMAVLinkJSON({
      id: `MISSION-${Date.now()}`,
      name: 'Smart Horizon Mission Plan',
      createdTime: new Date().toISOString(),
      cruiseSpeedKmh: 54,
      cruiseAltitudeM: 200,
      waypoints,
      homeLocation: { lat: 34.5011, lng: 45.0920, alt: 0 },
      geofencePolygons: []
    });

    const blob = new Blob([missionData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flight_plan_${Date.now()}.plan`;
    a.click();
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
      >
        {(map) => (
          <>
            <MissionPathRenderer map={map} waypoints={waypoints} activeWaypointIdx={activeWaypointIdx} />
            <OverlayRenderer map={map} geofences={geofences} aiDetections={aiDetections} showGeofence={showGeofence} />
            {showWaypointsLayer && (
              <WaypointRenderer
                map={map}
                waypoints={waypoints}
                activeWaypointIdx={activeWaypointIdx}
                onUpdateWaypoints={onUpdateWaypoints}
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
          <span className="text-slate-300 font-semibold uppercase">LIVE MISSION EXECUTION</span>
          <span className="text-slate-600">|</span>
          <span className="text-cyan-400">LAT {activeDrone.lat.toFixed(4)} N</span>
          <span className="text-cyan-400">LON {activeDrone.lng.toFixed(4)} E</span>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-400 font-bold">{estimates.totalDistanceKm} KM ROUTE</span>
        </div>

        <div className="flex items-center space-x-1.5 bg-[#090e18]/95 border border-[#1a2336] backdrop-blur-md p-1 rounded shadow-lg">
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
            onClick={() => setInteractionMode(interactionMode === 'ADD_WAYPOINT' ? 'SELECT' : 'ADD_WAYPOINT')}
            className={`p-1.5 rounded text-[10px] font-mono flex items-center space-x-1 ${
              interactionMode === 'ADD_WAYPOINT' ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADD WP</span>
          </button>
        </div>
      </div>

      {/* FLOATING SIMULATION & WAYPOINT PANEL */}
      <div className="absolute top-16 left-3 w-80 bg-[#090e18]/95 border border-[#1a2336] backdrop-blur-md p-3 rounded-lg shadow-2xl z-10 pointer-events-auto space-y-3">
        <div className="flex items-center justify-between border-b border-[#1a2336] pb-2">
          <div className="flex items-center space-x-2">
            <Compass className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-200 uppercase">Flight Execution Engine</span>
          </div>
          <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-bold">
            WP {activeWaypointIdx + 1} / {waypoints.length}
          </span>
        </div>

        {/* Simulation Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleToggleSimulation}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded text-xs font-bold transition-all ${
              simState.isRunning && !simState.isPaused
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-500/30'
            }`}
          >
            {simState.isRunning && !simState.isPaused ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>EXECUTE MISSION</span>
              </>
            )}
          </button>

          <button
            onClick={handleResetSimulation}
            className="p-2 bg-[#101726] border border-[#1e293b] text-slate-400 hover:text-rose-400 rounded transition-colors"
            title="Reset Flight"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Export Flight Plan */}
        <div className="flex items-center space-x-2 pt-1 border-t border-[#1a2336]">
          <button
            onClick={handleSaveMission}
            className="flex-1 flex items-center justify-center space-x-1 py-1.5 bg-[#101726] border border-[#1e293b] hover:border-cyan-500/50 text-slate-300 hover:text-cyan-400 rounded text-[10px] transition-colors"
          >
            <Download className="w-3 h-3 text-cyan-400" />
            <span>EXPORT .PLAN</span>
          </button>
          <button
            onClick={() => onUpdateWaypoints([])}
            className="p-1.5 bg-[#101726] border border-[#1e293b] text-slate-400 hover:text-rose-400 rounded transition-colors"
            title="Clear All Waypoints"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
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
