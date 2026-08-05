import React, { useState, useEffect } from 'react';
import { Plus, Navigation, Shield } from 'lucide-react';
import type { DroneAsset, TelemetryData, Waypoint, AIDetection } from '../../types';
import { MissionService, type MissionEstimates } from '../../services/missionService';
import { fleetStore } from '../../store/FleetStore';

// Geofence Subsystem Components
import GeofenceRenderer from '../../geofence/components/GeofenceRenderer';
import GeofenceToolbar from '../../geofence/components/GeofenceToolbar';
import GeofenceSidebar from '../../geofence/components/GeofenceSidebar';
import GeofenceEditor from '../../geofence/components/GeofenceEditor';
import GeofenceManagementPanel from '../../geofence/components/GeofenceManagementPanel';

// GIS Modular Components
import {
  MapRenderer,
  DroneRenderer,
  WaypointRenderer,
  MissionPathRenderer,
  LayerController,
  MapControls,
  MissionControlConsole,
  MapStyleMode,
  UAVMissionState
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

  // Geofence Subsystem Toggle State (Embedded in Dashboard)
  const [showGeofence, setShowGeofence] = useState(true);
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  // Layer & Panel Toggles
  const [showWaypointsLayer, setShowWaypointsLayer] = useState(true);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const [followDrone, setFollowDrone] = useState(true);
  const [is3D, setIs3D] = useState(false);

  // Mission Control Console State Machine
  const [missionState, setMissionState] = useState<UAVMissionState>('IDLE');
  const [activeWaypointIdx, setActiveWaypointIdx] = useState(0);

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
        if (missionExecutionEngine.getState() === 'COMPLETE') {
          setMissionState('COMPLETED');
        }
      });
    });
  }, [onUpdateDronePos]);

  // Mission Control Handlers
  const handleArm = () => setMissionState('ARMED');
  const handleDisarm = () => setMissionState('IDLE');
  const handleTakeoff = () => {
    import('../../engine/missionExecutionEngine').then(({ missionExecutionEngine }) => {
      missionExecutionEngine.takeoff(activeDrone, 50);
      setMissionState('EXECUTING');
    });
  };
  const handleStartMission = () => {
    import('../../engine/missionExecutionEngine').then(({ missionExecutionEngine }) => {
      missionExecutionEngine.startMission(activeDrone, waypoints);
      setMissionState('EXECUTING');
    });
  };
  const handlePauseMission = () => {
    import('../../engine/missionExecutionEngine').then(({ missionExecutionEngine }) => {
      missionExecutionEngine.pauseMission();
      setMissionState('PAUSED');
    });
  };
  const handleResumeMission = () => {
    import('../../engine/missionExecutionEngine').then(({ missionExecutionEngine }) => {
      missionExecutionEngine.resumeMission();
      setMissionState('EXECUTING');
    });
  };
  const handleRTH = () => {
    import('../../engine/missionExecutionEngine').then(({ missionExecutionEngine }) => {
      missionExecutionEngine.returnToHome(activeDrone);
      setMissionState('RTL');
    });
  };
  const handleLand = () => {
    import('../../engine/missionExecutionEngine').then(({ missionExecutionEngine }) => {
      missionExecutionEngine.land(activeDrone);
      setMissionState('LANDING');
    });
  };
  const handleAbort = () => {
    import('../../engine/missionExecutionEngine').then(({ missionExecutionEngine }) => {
      missionExecutionEngine.abortMission(activeDrone);
      setMissionState('IDLE');
    });
  };
  const handleReset = () => {
    import('../../engine/missionExecutionEngine').then(({ missionExecutionEngine }) => {
      missionExecutionEngine.reset();
      setMissionState('IDLE');
    });
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
      if (missionState === 'ARMED') setMissionState('READY');
      setInteractionMode('PAN');
    }
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
        cursorStyle={interactionMode === 'ADD_WAYPOINT' ? 'crosshair' : 'grab'}
      >
        {(map) => (
          <>
            <MissionPathRenderer map={map} waypoints={waypoints} activeWaypointIdx={activeWaypointIdx} />
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
            {showGeofence && <GeofenceRenderer map={map} />}
          </>
        )}
      </MapRenderer>

      {/* GEOFENCE UI PANELS */}
      {showGeofence && (
        <>
          <GeofenceToolbar onOpenManager={() => setIsManagerOpen(true)} />
          <GeofenceEditor />
          <GeofenceManagementPanel
            isOpen={isManagerOpen}
            onClose={() => setIsManagerOpen(false)}
          />
        </>
      )}

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
            isOpen={isLayerMenuOpen}
            onToggleOpen={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
          />

          <button
            onClick={() => setInteractionMode(interactionMode === 'ADD_WAYPOINT' ? 'PAN' : 'ADD_WAYPOINT')}
            className={`p-1.5 rounded text-[10px] font-mono flex items-center space-x-1 ${
              interactionMode === 'ADD_WAYPOINT' ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADD WP</span>
          </button>

          {/* GEOFENCE ACCESS BUTTON */}
          <button
            onClick={() => setShowGeofence(!showGeofence)}
            className={`p-1.5 rounded text-[10px] font-mono flex items-center space-x-1 transition-all ${
              showGeofence
                ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50 shadow-amber-500/20 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Geofence Subsystem"
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>GEOFENCE</span>
          </button>
        </div>
      </div>

      {/* LEFT COLUMN: TACTICAL MISSION CONTROL CONSOLE & GEOFENCE SIDEBAR */}
      <div className="absolute top-16 left-3 z-30 pointer-events-auto space-y-2 max-h-[calc(100vh-80px)] overflow-y-auto pr-1 scrollbar-none">
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
        {showGeofence && <GeofenceSidebar />}
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
