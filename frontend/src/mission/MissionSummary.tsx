import React from 'react';
import { useMissionStore } from '../stores/missionStore';
import { formatDistance, formatDuration } from '../utils/formatting';
import { Route, Clock, Battery, AlertCircle, CheckCircle2 } from 'lucide-react';

export const MissionSummary: React.FC = () => {
  const {
    mission_name,
    state,
    waypoints,
    distance_remaining,
    estimated_time_remaining,
    estimated_battery_required,
    risk_level,
    validation_status,
  } = useMissionStore();

  return (
    <div className="bg-[#0f141c]/90 border border-slate-800 rounded-lg p-3 space-y-3 font-mono text-xs select-none">
      {/* Title and status */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-2">
          <Route className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-slate-100 text-sm tracking-wide">{mission_name}</span>
        </div>
        <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 font-bold text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>{state}</span>
        </div>
      </div>

      {/* Grid of Key Metrics */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
          <div className="flex items-center space-x-1 text-slate-400 text-[10px]">
            <Route className="w-3 h-3 text-cyan-400" />
            <span>WAYPOINTS / DIST</span>
          </div>
          <div className="font-bold text-slate-100 text-sm mt-0.5 tabular-nums">
            {waypoints.length} <span className="text-xs text-slate-400 font-normal">pts</span> · {formatDistance(distance_remaining)}
          </div>
        </div>

        <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
          <div className="flex items-center space-x-1 text-slate-400 text-[10px]">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>EST FLIGHT TIME</span>
          </div>
          <div className="font-bold text-slate-100 text-sm mt-0.5 tabular-nums">
            {formatDuration(estimated_time_remaining)}
          </div>
        </div>

        <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
          <div className="flex items-center space-x-1 text-slate-400 text-[10px]">
            <Battery className="w-3 h-3 text-amber-400" />
            <span>EST BATTERY DRAIN</span>
          </div>
          <div className="font-bold text-amber-400 text-sm mt-0.5 tabular-nums">
            {estimated_battery_required.toFixed(1)}%
          </div>
        </div>

        <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
          <div className="flex items-center space-x-1 text-slate-400 text-[10px]">
            {risk_level === 'LOW' ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            ) : (
              <AlertCircle className="w-3 h-3 text-amber-400" />
            )}
            <span>RISK / VALIDATION</span>
          </div>
          <div className="font-bold text-slate-100 text-xs mt-0.5 flex items-center space-x-1">
            <span className={risk_level === 'LOW' ? 'text-emerald-400' : 'text-amber-400'}>
              {risk_level}
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-300">{validation_status}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
