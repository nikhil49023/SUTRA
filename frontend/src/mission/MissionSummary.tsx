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
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 space-y-3 font-mono text-xs select-none">
      {/* Title and status */}
      <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-[#151D26] border border-[#5B8FB9]/40 flex items-center justify-center">
            <Route className="w-3.5 h-3.5 text-[#5B8FB9]" />
          </div>
          <div>
            <span className="font-bold text-[#E7EBEF] text-sm tracking-wide">{mission_name}</span>
            <span className="text-[10px] text-[#707C88] ml-2">// ACTIVE FLIGHT PLAN</span>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded border border-[#5B8FB9]/40 bg-[#151D26] text-[#5B8FB9] font-bold text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#5B8FB9] animate-pulse" />
          <span>{state}</span>
        </div>
      </div>

      {/* Grid of Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="bg-[#151D26] p-2.5 rounded border border-[#2B3743]">
          <div className="flex items-center space-x-1 text-[#707C88] text-[10px]">
            <Route className="w-3 h-3 text-[#5B8FB9]" />
            <span>WAYPOINTS / DIST</span>
          </div>
          <div className="font-bold text-[#E7EBEF] text-sm mt-1 tabular-nums">
            {waypoints.length} <span className="text-xs text-[#707C88] font-normal">pts</span> · {formatDistance(distance_remaining)}
          </div>
        </div>

        <div className="bg-[#151D26] p-2.5 rounded border border-[#2B3743]">
          <div className="flex items-center space-x-1 text-[#707C88] text-[10px]">
            <Clock className="w-3 h-3 text-[#5B8FB9]" />
            <span>EST FLIGHT TIME</span>
          </div>
          <div className="font-bold text-[#E7EBEF] text-sm mt-1 tabular-nums">
            {formatDuration(estimated_time_remaining)}
          </div>
        </div>

        <div className="bg-[#151D26] p-2.5 rounded border border-[#2B3743]">
          <div className="flex items-center space-x-1 text-[#707C88] text-[10px]">
            <Battery className="w-3 h-3 text-[#C49A4A]" />
            <span>EST BATTERY DRAIN</span>
          </div>
          <div className="font-bold text-[#C49A4A] text-sm mt-1 tabular-nums">
            {estimated_battery_required.toFixed(1)}%
          </div>
        </div>

        <div className="bg-[#151D26] p-2.5 rounded border border-[#2B3743]">
          <div className="flex items-center space-x-1 text-[#707C88] text-[10px]">
            {risk_level === 'LOW' ? (
              <CheckCircle2 className="w-3 h-3 text-[#4F9A72]" />
            ) : (
              <AlertCircle className="w-3 h-3 text-[#C49A4A]" />
            )}
            <span>RISK / VALIDATION</span>
          </div>
          <div className="font-bold text-[#E7EBEF] text-xs mt-1 flex items-center space-x-1">
            <span className={risk_level === 'LOW' ? 'text-[#4F9A72]' : 'text-[#C49A4A]'}>
              {risk_level}
            </span>
            <span className="text-[#707C88]">·</span>
            <span className="text-[#A9B3BD]">{validation_status}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
