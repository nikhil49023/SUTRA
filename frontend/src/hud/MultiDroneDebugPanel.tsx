/**
 * Smart Horizon GCS — Multi-Drone Status & Diagnostic Panel
 *
 * Contextual & Section-Aware:
 * - EXPANDED by default in Dashboard, Mission, and Fleet views.
 * - COLLAPSED by default in Geofence, GIS, AI, Settings, and Logs views.
 * - User expand/collapse preferences are persisted per section.
 * - Minimal collapsed pill does not obstruct map navigation, waypoint placement, or geofence drawing.
 * - Toggle with Ctrl+D or click header/pill controls.
 * - Uses fine-grained selectors and memoization for 60 FPS performance.
 */

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { X, Bug, ChevronDown, ChevronUp, Activity, Radio } from 'lucide-react';
import { useFleetStore } from '../stores/fleetStore';
import { useMapStore } from '../stores/mapStore';
import { useMissionStore } from '../stores/missionStore';
import { useAppStore } from '../stores/appStore';
import { useSelectionStore } from '../stores/selectionStore';
import { useDroneStatusPanelStore, PanelDisplayMode } from '../stores/droneStatusPanelStore';
import { messageRouter } from '../communication/MessageRouter';

export const MultiDroneDebugPanel: React.FC = () => {
  const [, setTick] = useState(0);

  const activeSection = useAppStore((s) => s.activeSection);
  const interactionMode = useMapStore((s) => s.interactionMode);
  const selectedType = useSelectionStore((s) => s.selected_type);
  const drones = useFleetStore((s) => s.drones);
  const formation = useFleetStore((s) => s.formation);
  const leaderId = useFleetStore((s) => s.leader_id);
  const spacing = useFleetStore((s) => s.spacing);
  const waypointCount = useMissionStore((s) => s.waypoints.length);
  const lastMapClick = useMapStore((s) => s.lastMapClick);
  const lastWaypointCommandStatus = useMapStore((s) => s.lastWaypointCommandStatus);

  const {
    getModeForSection,
    setModeForSection,
    toggleModeForSection,
    isGloballyHidden,
  } = useDroneStatusPanelStore();

  // Determine current active contextual section
  const currentSection = useMemo(() => {
    if (interactionMode === 'DRAW_GEOFENCE' || selectedType === 'GEOFENCE') {
      return 'GEOFENCE';
    }
    return activeSection || 'COMMAND';
  }, [interactionMode, selectedType, activeSection]);

  const displayMode: PanelDisplayMode = isGloballyHidden ? 'HIDDEN' : getModeForSection(currentSection);

  // Keyboard toggle: Ctrl+D
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        toggleModeForSection(currentSection);
      }
    },
    [currentSection, toggleModeForSection]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Refresh router metrics every 1000ms
  useEffect(() => {
    if (displayMode !== 'EXPANDED') return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [displayMode]);

  if (displayMode === 'HIDDEN') return null;

  const droneList = Object.values(drones);
  const totalDrones = droneList.length;
  const movingDrones = droneList.filter((d) => d.speed > 0.5).length;
  const stationaryDrones = totalDrones - movingDrones;
  const dronesWithTargets = droneList.filter(
    (d) => d.target_latitude != null && d.target_longitude != null
  ).length;
  const telemetryActive = droneList.filter((d) => d.latitude !== 0 && d.longitude !== 0).length;
  const leader = leaderId ? drones[leaderId] : droneList.find((d) => d.is_leader || d.role === 'LEADER');

  const waypointMode = interactionMode === 'ADD_WAYPOINT' ? 'ACTIVE' : 'INACTIVE';

  // ── COLLAPSED COMPACT PILL MODE ──────────────────────────────────────────
  if (displayMode === 'COLLAPSED') {
    return (
      <div className="absolute bottom-12 right-4 z-30 pointer-events-auto select-none">
        <button
          onClick={() => setModeForSection(currentSection, 'EXPANDED')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#2B3743] bg-[#11171E]/95 hover:bg-[#151D26] hover:border-[#5B8FB9] shadow-xl text-[#E7EBEF] font-mono text-[11px] transition-all hover:scale-105 active:scale-95 group"
          title="Click to expand Drone Status Card (Ctrl+D)"
        >
          <Activity className="w-3.5 h-3.5 text-[#5B8FB9] animate-pulse" />
          <span className="font-bold text-[#E7EBEF] tracking-wide">DRONE STATUS</span>
          <span className="px-1.5 py-0.5 rounded bg-[#1B2530] text-[#4F9A72] font-bold text-[10px] border border-[#4F9A72]/30 tabular-nums">
            {movingDrones > 0 ? `${movingDrones}/${totalDrones} MOVING` : `${totalDrones}/${totalDrones} READY`}
          </span>
          <ChevronUp className="w-3.5 h-3.5 text-[#707C88] group-hover:text-[#5B8FB9] transition-colors" />
        </button>
      </div>
    );
  }

  // ── EXPANDED FULL CARD MODE ──────────────────────────────────────────────
  return (
    <div className="absolute bottom-12 right-4 z-30 w-[280px] rounded-lg border border-[#2B3743] bg-[#11171E]/95 shadow-2xl text-[#E7EBEF] font-mono select-none pointer-events-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#2B3743] bg-[#151D26] rounded-t-lg">
        <div className="flex items-center gap-2">
          <Bug className="w-3.5 h-3.5 text-[#5B8FB9]" />
          <span className="text-[11px] font-bold text-[#E7EBEF] tracking-widest">DRONE STATUS & HUD</span>
          <span className="text-[9px] text-[#707C88]">[Ctrl+D]</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setModeForSection(currentSection, 'COLLAPSED')}
            className="text-[#707C88] hover:text-[#E7EBEF] hover:bg-[#1B2530] rounded p-0.5 transition"
            title="Collapse to minimal pill"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setModeForSection(currentSection, 'COLLAPSED')}
            className="text-[#707C88] hover:text-[#C75A5A] hover:bg-[#1B2530] rounded p-0.5 transition"
            title="Close / Collapse"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content Body */}
      <div className="px-3 py-2 space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto">
        {/* Fleet Section */}
        <div>
          <div className="text-[9px] font-bold text-[#5B8FB9] uppercase tracking-widest mb-1 flex items-center gap-1">
            <Radio className="w-2.5 h-2.5" />
            <span>Fleet Status</span>
          </div>
          <StatusRow label="Total Drones" value={totalDrones} />
          <StatusRow
            label="Moving"
            value={`${movingDrones}/${totalDrones}`}
            ok={movingDrones === totalDrones && totalDrones > 0}
            warn={movingDrones > 0 && movingDrones < totalDrones}
          />
          <StatusRow label="Stationary" value={stationaryDrones} warn={stationaryDrones > 0 && movingDrones > 0} />
          <StatusRow
            label="Targets Assigned"
            value={`${dronesWithTargets}/${totalDrones}`}
            ok={dronesWithTargets === totalDrones}
            warn={dronesWithTargets < totalDrones}
          />
          <StatusRow
            label="Telemetry Active"
            value={`${telemetryActive}/${totalDrones}`}
            ok={telemetryActive === totalDrones}
          />
        </div>

        {/* Per-Drone Positions */}
        <div>
          <div className="text-[9px] font-bold text-[#5B8FB9] uppercase tracking-widest mb-1">Drone Positions</div>
          {droneList.map((d) => (
            <div key={d.drone_id} className="py-0.5 border-b border-[#2B3743]/40 last:border-0">
              <div className="flex justify-between items-center">
                <span className={`text-[10px] font-bold ${d.is_leader ? 'text-[#C49A4A]' : 'text-[#A9B3BD]'}`}>
                  {d.is_leader ? '★ ' : '  '}
                  {d.callsign.split(' ')[0]}
                </span>
                <span className={`text-[10px] tabular-nums ${d.speed > 0.5 ? 'text-[#4F9A72] font-bold' : 'text-[#707C88]'}`}>
                  {d.speed.toFixed(1)}m/s
                </span>
              </div>
              <div className="text-[9px] text-[#707C88] tabular-nums">
                {d.latitude.toFixed(5)}, {d.longitude.toFixed(5)} ({d.altitude.toFixed(0)}m)
              </div>
            </div>
          ))}
        </div>

        {/* Formation Section */}
        <div>
          <div className="text-[9px] font-bold text-[#5B8FB9] uppercase tracking-widest mb-1">Formation</div>
          <StatusRow label="Type" value={formation || 'NONE'} />
          <StatusRow label="Leader" value={leader?.callsign?.split(' ')[0] || 'NONE'} ok={!!leader} />
          <StatusRow label="Spacing" value={`${spacing}m`} />
        </div>

        {/* Message Router Metrics */}
        <div>
          <div className="text-[9px] font-bold text-[#5B8FB9] uppercase tracking-widest mb-1">Message Router</div>
          <StatusRow
            label="Dropped (stale)"
            value={messageRouter.droppedStaleEventsCount}
            warn={messageRouter.droppedStaleEventsCount > 0}
          />
          <StatusRow label="Dropped (dup)" value={messageRouter.droppedDuplicateEventsCount} />
          <StatusRow label="Dropped (out-of-seq)" value={messageRouter.droppedOutOfOrderTelemCount} />
          <StatusRow label="State gaps" value={messageRouter.stateGapCount} warn={messageRouter.stateGapCount > 0} />
        </div>

        {/* Waypoint Tool Section */}
        <div>
          <div className="text-[9px] font-bold text-[#5B8FB9] uppercase tracking-widest mb-1">Waypoint Tool</div>
          <StatusRow label="Mode" value={waypointMode} ok={waypointMode === 'ACTIVE'} />
          <StatusRow
            label="Last Click"
            value={lastMapClick ? `${lastMapClick.lat.toFixed(4)}, ${lastMapClick.lng.toFixed(4)}` : '—'}
          />
          <StatusRow
            label="Last Command"
            value={lastWaypointCommandStatus}
            ok={lastWaypointCommandStatus === 'SUCCESS'}
            warn={lastWaypointCommandStatus === 'SENT' || lastWaypointCommandStatus === 'FAILED'}
          />
          <StatusRow label="Waypoints" value={waypointCount} />
        </div>
      </div>
    </div>
  );
};

const StatusRow: React.FC<{ label: string; value: React.ReactNode; ok?: boolean; warn?: boolean }> = memo(
  ({ label, value, ok, warn }) => (
    <div className="flex justify-between items-center py-0.5 border-b border-[#2B3743]/50 last:border-0">
      <span className="text-[#707C88] text-[10px] font-mono">{label}</span>
      <span
        className={`text-[10px] font-mono font-bold tabular-nums ${
          ok ? 'text-[#4F9A72]' : warn ? 'text-[#C49A4A]' : 'text-[#E7EBEF]'
        }`}
      >
        {value}
      </span>
    </div>
  )
);
