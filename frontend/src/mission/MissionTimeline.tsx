import React from 'react';
import { useMissionStore } from '../stores/missionStore';
import { History, CheckCircle, Navigation } from 'lucide-react';

export const MissionTimeline: React.FC = () => {
  const { waypoints, active_waypoint_index } = useMissionStore();

  return (
    <div className="bg-[#0f141c]/90 border border-slate-800 rounded-lg p-3 font-mono text-xs select-none space-y-2">
      <div className="flex items-center space-x-1.5 text-slate-300 font-bold border-b border-slate-800 pb-1.5">
        <History className="w-3.5 h-3.5 text-cyan-400" />
        <span>FLIGHT PROGRESSION TIMELINE</span>
      </div>

      <div className="flex items-center space-x-1 overflow-x-auto py-1">
        {waypoints.map((wp, i) => {
          const isPassed = wp.index < active_waypoint_index;
          const isCurrent = wp.index === active_waypoint_index;

          return (
            <React.Fragment key={wp.id || wp.index}>
              <div
                className={`flex-shrink-0 px-2 py-1 rounded flex items-center space-x-1 text-[10px] font-bold border ${
                  isPassed
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                    : isCurrent
                    ? 'bg-cyan-500 border-white text-black ring-2 ring-cyan-400/50 animate-pulse'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                {isPassed ? (
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                ) : isCurrent ? (
                  <Navigation className="w-3 h-3 text-black" />
                ) : null}
                <span>WP{wp.index}</span>
              </div>
              {i < waypoints.length - 1 && (
                <div className={`h-[2px] w-3 flex-shrink-0 ${isPassed ? 'bg-emerald-500' : 'bg-slate-800'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
