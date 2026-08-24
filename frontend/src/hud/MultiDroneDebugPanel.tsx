/**
 * Smart Horizon GCS — Temporary Multi-Drone & Waypoint Diagnostic HUD
 * Shows real-time fleet movement status, telemetry counts, formation integrity,
 * and waypoint tool status for debugging BUG 1 and BUG 2.
 *
 * Embed in TacticalLayout or MapView overlay.
 * Can be toggled with Ctrl+D.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Bug, ChevronDown, ChevronUp } from 'lucide-react';
import { useFleetStore } from '../stores/fleetStore';
import { useMapStore } from '../stores/mapStore';
import { useMissionStore } from '../stores/missionStore';
import { messageRouter } from '../communication/MessageRouter';

export const MultiDroneDebugPanel: React.FC = () => {
  const [visible, setVisible] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [tick, setTick] = useState(0);

  const fleetState = useFleetStore();
  const mapStore = useMapStore();
  const missionState = useMissionStore();

  // Keyboard toggle: Ctrl+D
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      setVisible((v) => !v);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Refresh metrics every 500ms
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, []);

  if (!visible) return null;

  const drones = Object.values(fleetState.drones);
  const totalDrones = drones.length;
  const movingDrones = drones.filter((d) => d.speed > 0.5).length;
  const stationaryDrones = totalDrones - movingDrones;
  const dronesWithTargets = drones.filter(
    (d) => d.target_latitude != null && d.target_longitude != null
  ).length;
  const telemetryActive = drones.filter((d) => d.latitude !== 0 && d.longitude !== 0).length;
  const formation = fleetState.formation || 'NONE';
  const leader = fleetState.leader_id
    ? fleetState.drones[fleetState.leader_id]
    : drones.find((d) => d.is_leader || d.role === 'LEADER');

  const msgMetrics = messageRouter;
  const waypointMode = mapStore.interactionMode === 'ADD_WAYPOINT' ? 'ACTIVE' : 'INACTIVE';
  const lastClick = mapStore.lastMapClick;
  const wpStatus = mapStore.lastWaypointCommandStatus;

  const Row: React.FC<{ label: string; value: React.ReactNode; ok?: boolean; warn?: boolean }> = ({
    label, value, ok, warn,
  }) => (
    <div className="flex justify-between items-center py-0.5 border-b border-slate-800/50 last:border-0">
      <span className="text-slate-500 text-[10px] font-mono">{label}</span>
      <span
        className={`text-[10px] font-mono font-bold ${
          ok ? 'text-emerald-400' : warn ? 'text-amber-400' : 'text-slate-300'
        }`}
      >
        {value}
      </span>
    </div>
  );

  return (
    <div className="absolute bottom-12 right-4 z-30 w-[280px] rounded border border-cyan-800/60 bg-[#080c12]/95 backdrop-blur-md shadow-2xl text-slate-300 font-mono select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800 bg-cyan-950/40">
        <div className="flex items-center gap-2">
          <Bug className="w-3 h-3 text-cyan-400" />
          <span className="text-[11px] font-bold text-cyan-300 tracking-widest">DIAGNOSTIC HUD</span>
          <span className="text-[9px] text-slate-500">[Ctrl+D]</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setCollapsed((c) => !c)} className="text-slate-500 hover:text-slate-300 p-0.5">
            {collapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
          <button onClick={() => setVisible(false)} className="text-slate-500 hover:text-red-400 p-0.5">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="px-3 py-2 space-y-3">
          {/* Fleet Section */}
          <div>
            <div className="text-[9px] font-bold text-cyan-600 uppercase tracking-widest mb-1">Fleet Status</div>
            <Row label="Total Drones" value={totalDrones} />
            <Row
              label="Moving"
              value={`${movingDrones}/${totalDrones}`}
              ok={movingDrones === totalDrones && totalDrones > 0}
              warn={movingDrones > 0 && movingDrones < totalDrones}
            />
            <Row label="Stationary" value={stationaryDrones} warn={stationaryDrones > 0 && movingDrones > 0} />
            <Row
              label="Targets Assigned"
              value={`${dronesWithTargets}/${totalDrones}`}
              ok={dronesWithTargets === totalDrones}
              warn={dronesWithTargets < totalDrones}
            />
            <Row
              label="Telemetry Active"
              value={`${telemetryActive}/${totalDrones}`}
              ok={telemetryActive === totalDrones}
            />
          </div>

          {/* Per-Drone Positions */}
          <div>
            <div className="text-[9px] font-bold text-cyan-600 uppercase tracking-widest mb-1">Drone Positions</div>
            {drones.map((d) => (
              <div key={d.drone_id} className="py-0.5 border-b border-slate-800/40 last:border-0">
                <div className="flex justify-between">
                  <span className={`text-[10px] ${d.is_leader ? 'text-amber-400' : 'text-slate-400'}`}>
                    {d.is_leader ? '★ ' : '  '}{d.callsign.split(' ')[0]}
                  </span>
                  <span className={`text-[10px] ${d.speed > 0.5 ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {d.speed.toFixed(1)}m/s
                  </span>
                </div>
                <div className="text-[9px] text-slate-600">
                  {d.latitude.toFixed(5)}, {d.longitude.toFixed(5)}
                </div>
              </div>
            ))}
          </div>

          {/* Formation Section */}
          <div>
            <div className="text-[9px] font-bold text-cyan-600 uppercase tracking-widest mb-1">Formation</div>
            <Row label="Type" value={formation} />
            <Row label="Leader" value={leader?.callsign?.split(' ')[0] || 'NONE'} ok={!!leader} />
            <Row label="Spacing" value={`${fleetState.spacing}m`} />
          </div>

          {/* Message Router Metrics */}
          <div>
            <div className="text-[9px] font-bold text-cyan-600 uppercase tracking-widest mb-1">Message Router</div>
            <Row label="Dropped (stale)" value={msgMetrics.droppedStaleEventsCount} warn={msgMetrics.droppedStaleEventsCount > 0} />
            <Row label="Dropped (dup)" value={msgMetrics.droppedDuplicateEventsCount} />
            <Row label="Dropped (out-of-seq)" value={msgMetrics.droppedOutOfOrderTelemCount} />
            <Row label="State gaps" value={msgMetrics.stateGapCount} warn={msgMetrics.stateGapCount > 0} />
          </div>

          {/* Waypoint Tool Section */}
          <div>
            <div className="text-[9px] font-bold text-cyan-600 uppercase tracking-widest mb-1">Waypoint Tool</div>
            <Row
              label="Mode"
              value={waypointMode}
              ok={waypointMode === 'ACTIVE'}
            />
            <Row
              label="Last Click"
              value={lastClick ? `${lastClick.lat.toFixed(4)}, ${lastClick.lng.toFixed(4)}` : '—'}
            />
            <Row
              label="Last Command"
              value={wpStatus}
              ok={wpStatus === 'SUCCESS'}
              warn={wpStatus === 'SENT' || wpStatus === 'FAILED'}
            />
            <Row label="Waypoints" value={missionState.waypoints.length} />
          </div>
        </div>
      )}
    </div>
  );
};
