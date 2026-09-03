import React from 'react';
import { useMissionStore } from '../stores/missionStore';
import { History, CheckCircle, Navigation } from 'lucide-react';

export const MissionTimeline: React.FC = () => {
  const { waypoints, active_waypoint_index } = useMissionStore();

  return (
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 font-mono text-xs select-none space-y-2.5">
      <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
        <div className="flex items-center space-x-1.5 text-[#E7EBEF] font-bold">
          <History className="w-3.5 h-3.5 text-[#5B8FB9]" />
          <span>FLIGHT PROGRESSION TIMELINE</span>
        </div>
        <span className="text-[10px] text-[#707C88]">
          ACTIVE: WP {active_waypoint_index} / {waypoints.length}
        </span>
      </div>

      <div className="flex items-center space-x-1.5 overflow-x-auto py-1 custom-scrollbar">
        {waypoints.length === 0 ? (
          <span className="text-[#707C88] text-[11px] py-1">No waypoints in active mission.</span>
        ) : (
          waypoints.map((wp, i) => {
            const isPassed = wp.index < active_waypoint_index;
            const isCurrent = wp.index === active_waypoint_index;

            return (
              <React.Fragment key={wp.id || wp.index}>
                <div
                  className={`flex-shrink-0 px-2.5 py-1 rounded flex items-center space-x-1.5 text-[10px] font-bold border transition ${
                    isPassed
                      ? 'bg-[#151D26] border-[#4F9A72]/60 text-[#4F9A72]'
                      : isCurrent
                      ? 'bg-[#5B8FB9] border-white text-[#0B0F14] shadow-[0_0_8px_rgba(91,143,185,0.6)] animate-pulse'
                      : 'bg-[#151D26] border-[#2B3743] text-[#707C88]'
                  }`}
                >
                  {isPassed ? (
                    <CheckCircle className="w-3 h-3 text-[#4F9A72]" />
                  ) : isCurrent ? (
                    <Navigation className="w-3 h-3 text-[#0B0F14]" />
                  ) : null}
                  <span>WP{wp.index}</span>
                </div>
                {i < waypoints.length - 1 && (
                  <div className={`h-[2px] w-3 flex-shrink-0 ${isPassed ? 'bg-[#4F9A72]' : 'bg-[#2B3743]'}`} />
                )}
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
};
