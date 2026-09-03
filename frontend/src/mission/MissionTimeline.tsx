/**
 * Smart Horizon GCS — Interactive Mission Flight Path Timeline & Stepper
 */

import React, { memo } from 'react';
import { useMissionStore } from '../stores/missionStore';
import { useSelectionStore } from '../stores/selectionStore';
import { History, CheckCircle2, Navigation, Flag, Compass } from 'lucide-react';

export const MissionTimeline: React.FC = memo(() => {
  const { waypoints, active_waypoint_index, state } = useMissionStore();
  const selectWaypoint = useSelectionStore((s) => s.selectWaypoint);
  const selectedId = useSelectionStore((s) => s.selected_id);

  const isRunning = state === 'MISSION' || state === 'IN_PROGRESS';

  return (
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 font-mono text-xs select-none space-y-2.5 shadow-md">
      <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
        <div className="flex items-center space-x-1.5 text-[#E7EBEF] font-bold">
          <History className="w-4 h-4 text-[#5B8FB9]" />
          <span>FLIGHT PROGRESSION TIMELINE</span>
        </div>
        <div className="text-[10px] text-[#A9B3BD] flex items-center space-x-1.5">
          <span>ACTIVE:</span>
          <span className="font-extrabold text-[#10B981]">WP {active_waypoint_index}</span>
          <span className="text-[#707C88]">/ {waypoints.length}</span>
        </div>
      </div>

      <div className="flex items-center space-x-1.5 overflow-x-auto py-2 px-1 custom-scrollbar">
        {waypoints.length === 0 ? (
          <span className="text-[#707C88] text-[11px] py-1">No waypoints in active mission corridor.</span>
        ) : (
          waypoints.map((wp, i) => {
            const isPassed = wp.index < active_waypoint_index;
            const isCurrent = wp.index === active_waypoint_index;
            const isSelected = selectedId === wp.id || selectedId === String(wp.index);

            return (
              <React.Fragment key={wp.id || wp.index}>
                <button
                  onClick={() => selectWaypoint(String(wp.id || wp.index))}
                  className={`flex-shrink-0 px-2.5 py-1.5 rounded flex items-center space-x-1.5 text-[10px] font-bold border transition cursor-pointer ${
                    isSelected
                      ? 'bg-[#5B8FB9] border-white text-[#0B0F14] shadow-[0_0_10px_rgba(91,143,185,0.7)] scale-105'
                      : isCurrent
                      ? 'bg-[#10B981] border-[#34D399] text-white shadow-[0_0_10px_rgba(16,185,129,0.7)] animate-pulse scale-105'
                      : isPassed
                      ? 'bg-[#064E3B]/80 border-[#059669] text-[#34D399] opacity-80 hover:opacity-100'
                      : 'bg-[#151D26] border-[#2B3743] text-[#707C88] hover:text-[#E7EBEF] hover:border-[#5B8FB9]'
                  }`}
                  title={`Waypoint #${wp.index} (Alt: ${wp.altitude}m, Spd: ${wp.speed}m/s)`}
                >
                  {isPassed ? (
                    <CheckCircle2 className="w-3 h-3 text-[#34D399]" />
                  ) : isCurrent ? (
                    <Navigation className="w-3 h-3 text-white fill-current" />
                  ) : i === waypoints.length - 1 ? (
                    <Flag className="w-3 h-3 text-[#707C88]" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#707C88]" />
                  )}
                  <span>WP{wp.index}</span>
                </button>
                {i < waypoints.length - 1 && (
                  <div
                    className={`h-[2px] w-4 flex-shrink-0 transition-colors ${
                      isPassed ? 'bg-[#10B981]' : isCurrent && isRunning ? 'bg-[#10B981]/50' : 'bg-[#2B3743]'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
});
