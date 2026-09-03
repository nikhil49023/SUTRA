/**
 * Smart Horizon GCS — Tactical Waypoint Corridor & Progression List
 */

import React, { memo } from 'react';
import { useMissionStore } from '../stores/missionStore';
import { useSelectionStore } from '../stores/selectionStore';
import { useFleetStore } from '../stores/fleetStore';
import { commandManager } from '../communication/CommandManager';
import { Waypoint } from '../types/mission';
import { Trash2, ArrowUp, ArrowDown, MapPin, CheckCircle2, Navigation, Target } from 'lucide-react';

export const WaypointList: React.FC = memo(() => {
  const waypoints = useMissionStore((s) => s.waypoints);
  const activeWaypointIndex = useMissionStore((s) => s.active_waypoint_index);
  const selectedType = useSelectionStore((s) => s.selected_type);
  const selectedId = useSelectionStore((s) => s.selected_id);
  const selectWaypoint = useSelectionStore((s) => s.selectWaypoint);
  const updateWaypoint = useMissionStore((s) => s.updateWaypoint);
  const deleteWaypoint = useMissionStore((s) => s.deleteWaypoint);
  const reorderWaypoints = useMissionStore((s) => s.reorderWaypoints);

  const drones = useFleetStore((s) => s.drones);
  const leader = Object.values(drones).find((d) => d.is_leader) || Object.values(drones)[0];

  const handleSelect = (wp: Waypoint) => {
    const id = String(wp.id || wp.index);
    selectWaypoint(id);
    commandManager.sendCommand('mission.select_waypoint', { waypoint_id: id });
  };

  const handleDelete = (e: React.MouseEvent, wp: Waypoint) => {
    e.stopPropagation();
    deleteWaypoint(wp.id || wp.index);
  };

  const handleMoveUp = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (index > 1) {
      reorderWaypoints(index, index - 1);
    }
  };

  const handleMoveDown = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (index < waypoints.length) {
      reorderWaypoints(index, index + 1);
    }
  };

  return (
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg overflow-hidden flex flex-col font-mono text-xs select-none shadow-md">
      {/* Header */}
      <div className="bg-[#151D26] px-3 py-2.5 border-b border-[#2B3743] flex justify-between items-center text-[#E7EBEF] font-bold">
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-[#5B8FB9]" />
          <span>WAYPOINT CORRIDOR ({waypoints.length} SETPOINTS)</span>
        </div>
        <div className="text-[10px] text-[#A9B3BD] flex items-center space-x-2">
          <span className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            <span>PASSED: {Math.max(0, activeWaypointIndex - 1)}</span>
          </span>
          <span>·</span>
          <span className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5B8FB9]" />
            <span>PENDING: {Math.max(0, waypoints.length - activeWaypointIndex + 1)}</span>
          </span>
        </div>
      </div>

      {/* Waypoint Rows */}
      <div className="divide-y divide-[#2B3743]/60 max-h-[380px] overflow-y-auto custom-scrollbar">
        {waypoints.length === 0 ? (
          <div className="p-6 text-center text-[#707C88] text-xs space-y-1.5">
            <div>No waypoints in mission corridor.</div>
            <div className="text-[11px] text-[#5B8FB9]">
              Click "+ ADD WAYPOINT" or choose a 1-click preset from the toolbar above.
            </div>
          </div>
        ) : (
          waypoints.map((wp) => {
            const isSelected = selectedType === 'WAYPOINT' && (selectedId === wp.id || selectedId === String(wp.index));
            const isPassed = wp.index < activeWaypointIndex;
            const isActive = wp.index === activeWaypointIndex;

            return (
              <div
                key={wp.id || wp.index}
                onClick={() => handleSelect(wp)}
                className={`px-3 py-2.5 flex items-center justify-between cursor-pointer transition ${
                  isSelected
                    ? 'bg-[#1B2530] border-l-4 border-l-[#5B8FB9] text-[#E7EBEF]'
                    : isActive
                    ? 'bg-[#15231C] border-l-4 border-l-[#10B981] text-[#E7EBEF]'
                    : isPassed
                    ? 'bg-[#11171E] opacity-70 hover:opacity-100 hover:bg-[#151D26] text-[#A9B3BD]'
                    : 'hover:bg-[#151D26] text-[#A9B3BD]'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  {/* Waypoint Number Circle */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shadow-sm transition ${
                      isSelected
                        ? 'bg-[#5B8FB9] text-[#0B0F14] ring-2 ring-[#5B8FB9]/50'
                        : isActive
                        ? 'bg-[#10B981] text-white shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse'
                        : isPassed
                        ? 'bg-[#064E3B] text-[#34D399] border border-[#059669]'
                        : 'bg-[#0B0F14] text-[#5B8FB9] border border-[#2B3743]'
                    }`}
                  >
                    {isPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : wp.index}
                  </div>

                  {/* Waypoint Details */}
                  <div className="space-y-0.5">
                    <div className="font-bold text-xs flex items-center space-x-1.5">
                      <span className={isActive ? 'text-[#10B981]' : isPassed ? 'text-[#34D399]' : 'text-[#E7EBEF]'}>
                        {wp.command || 'WAYPOINT'} #{wp.index}
                      </span>

                      {isActive && (
                        <span className="px-1.5 py-0.2 bg-[#10B981]/20 border border-[#10B981] text-[#10B981] rounded text-[9px] font-extrabold animate-pulse">
                          CURRENT TARGET
                        </span>
                      )}

                      {isPassed && (
                        <span className="px-1.5 py-0.2 bg-[#064E3B]/40 text-[#34D399] rounded text-[9px]">
                          COMPLETED
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] text-[#707C88] tabular-nums flex items-center space-x-3">
                      <span>GPS: <b className="text-[#A9B3BD]">{wp.latitude.toFixed(5)}°, {wp.longitude.toFixed(5)}°</b></span>
                      <span>ALT: <b className="text-[#5B8FB9]">{wp.altitude}m</b></span>
                      <span>SPD: <b className="text-[#E7EBEF]">{wp.speed}m/s</b></span>
                      {typeof wp.hold_time === 'number' && wp.hold_time > 0 && (
                        <span>HOLD: <b>{wp.hold_time}s</b></span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions: Reorder / Delete */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={(e) => handleMoveUp(e, wp.index)}
                    disabled={wp.index === 1}
                    className="p-1 rounded hover:bg-[#1B2530] text-[#707C88] hover:text-[#E7EBEF] disabled:opacity-20 transition"
                    title="Move Waypoint Up"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>

                  <button
                    onClick={(e) => handleMoveDown(e, wp.index)}
                    disabled={wp.index === waypoints.length}
                    className="p-1 rounded hover:bg-[#1B2530] text-[#707C88] hover:text-[#E7EBEF] disabled:opacity-20 transition"
                    title="Move Waypoint Down"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>

                  <button
                    onClick={(e) => handleDelete(e, wp)}
                    className="p-1 rounded hover:bg-[#EF4444]/20 text-[#EF4444] transition"
                    title="Delete Waypoint"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});
