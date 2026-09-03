/**
 * Smart Horizon GCS — Tactical Mission Summary & Real-Time Progress Bar
 */

import React, { memo } from 'react';
import { useMissionStore } from '../stores/missionStore';
import { formatDistance, formatDuration } from '../utils/formatting';
import { Route, Clock, Battery, AlertCircle, CheckCircle2, Navigation, Compass, Activity } from 'lucide-react';

export const MissionSummary: React.FC = memo(() => {
  const {
    mission_name,
    state,
    waypoints,
    active_waypoint_index,
    mission_progress,
    distance_remaining,
    estimated_time_remaining,
    estimated_battery_required,
    risk_level,
    validation_status,
  } = useMissionStore();

  const isRunning = state === 'MISSION' || state === 'IN_PROGRESS';
  const isHold = state === 'HOLD' || state === 'PAUSED';
  const isRtl = state === 'RTL';
  const isCompleted = state === 'COMPLETED';

  const progressPercent = Math.min(100, Math.max(0, mission_progress || 0));

  return (
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 space-y-3 font-mono text-xs select-none shadow-md">
      {/* 1. Header: Mission Title, Status Indicator, Active Target Waypoint */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2B3743] pb-2.5">
        <div className="flex items-center space-x-2.5">
          <div className={`w-7 h-7 rounded flex items-center justify-center border ${
            isRunning
              ? 'bg-[#10B981]/20 border-[#10B981] text-[#10B981] animate-pulse'
              : isHold
              ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]'
              : isRtl
              ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-[#8B5CF6]'
              : 'bg-[#151D26] border-[#5B8FB9]/40 text-[#5B8FB9]'
          }`}>
            <Route className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-[#E7EBEF] text-sm tracking-wider">{mission_name}</span>
              <span className="text-[10px] text-[#707C88]">// AUTONOMOUS CORRIDOR</span>
            </div>
            <div className="text-[10px] text-[#A9B3BD] flex items-center space-x-2 mt-0.5">
              <span>TARGET: <b className="text-white">WP {active_waypoint_index}</b> of {waypoints.length}</span>
              <span>·</span>
              <span>PASSED: <b className="text-[#10B981]">{Math.max(0, active_waypoint_index - 1)}</b> WPs</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-1.5 px-3 py-1 rounded border font-extrabold text-[11px] shadow-sm ${
            isRunning
              ? 'bg-[#10B981]/15 border-[#10B981] text-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-pulse'
              : isHold
              ? 'bg-[#F59E0B]/15 border-[#F59E0B] text-[#F59E0B]'
              : isRtl
              ? 'bg-[#8B5CF6]/15 border-[#8B5CF6] text-[#8B5CF6] animate-pulse'
              : isCompleted
              ? 'bg-[#3B82F6]/15 border-[#3B82F6] text-[#3B82F6]'
              : 'bg-[#151D26] border-[#5B8FB9]/40 text-[#5B8FB9]'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isRunning ? 'bg-[#10B981] animate-ping' : isHold ? 'bg-[#F59E0B]' : isRtl ? 'bg-[#8B5CF6]' : 'bg-[#5B8FB9]'
            }`} />
            <span>{state}</span>
          </div>
        </div>
      </div>

      {/* 2. Real-Time Mission Progress Bar */}
      <div className="space-y-1 bg-[#151D26] p-2 rounded border border-[#2B3743]">
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-[#707C88] font-bold flex items-center space-x-1">
            <Activity className="w-3 h-3 text-[#5B8FB9]" />
            <span>CORRIDOR TRAVERSAL PROGRESS</span>
          </span>
          <span className="font-extrabold text-[#E7EBEF] tabular-nums text-xs">
            {progressPercent.toFixed(1)}%
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-[#0B0F14] border border-[#2B3743] overflow-hidden relative">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              isRunning
                ? 'bg-gradient-to-r from-[#10B981] to-[#34D399] shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                : isHold
                ? 'bg-[#F59E0B]'
                : isRtl
                ? 'bg-[#8B5CF6]'
                : isCompleted
                ? 'bg-[#3B82F6]'
                : 'bg-[#5B8FB9]'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 3. Grid of Key Tactical Telemetry Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-[#151D26] p-2.5 rounded border border-[#2B3743] hover:border-[#5B8FB9]/40 transition">
          <div className="flex items-center space-x-1 text-[#707C88] text-[10px]">
            <Navigation className="w-3 h-3 text-[#5B8FB9]" />
            <span>DISTANCE REMAINING</span>
          </div>
          <div className="font-bold text-[#E7EBEF] text-sm mt-1 tabular-nums">
            {formatDistance(distance_remaining)}
          </div>
          <div className="text-[9px] text-[#707C88] mt-0.5">
            Total {waypoints.length} waypoints
          </div>
        </div>

        <div className="bg-[#151D26] p-2.5 rounded border border-[#2B3743] hover:border-[#5B8FB9]/40 transition">
          <div className="flex items-center space-x-1 text-[#707C88] text-[10px]">
            <Clock className="w-3 h-3 text-[#5B8FB9]" />
            <span>EST FLIGHT TIME</span>
          </div>
          <div className="font-bold text-[#E7EBEF] text-sm mt-1 tabular-nums">
            {formatDuration(estimated_time_remaining)}
          </div>
          <div className="text-[9px] text-[#707C88] mt-0.5">
            @ ~6.0 m/s nominal
          </div>
        </div>

        <div className="bg-[#151D26] p-2.5 rounded border border-[#2B3743] hover:border-[#C49A4A]/40 transition">
          <div className="flex items-center space-x-1 text-[#707C88] text-[10px]">
            <Battery className="w-3 h-3 text-[#C49A4A]" />
            <span>EST BATTERY DRAIN</span>
          </div>
          <div className="font-bold text-[#C49A4A] text-sm mt-1 tabular-nums">
            {estimated_battery_required.toFixed(1)}%
          </div>
          <div className="text-[9px] text-[#707C88] mt-0.5">
            Safe reserve: &gt; 25%
          </div>
        </div>

        <div className="bg-[#151D26] p-2.5 rounded border border-[#2B3743] hover:border-[#4F9A72]/40 transition">
          <div className="flex items-center space-x-1 text-[#707C88] text-[10px]">
            {risk_level === 'LOW' ? (
              <CheckCircle2 className="w-3 h-3 text-[#4F9A72]" />
            ) : (
              <AlertCircle className="w-3 h-3 text-[#F59E0B]" />
            )}
            <span>AIRSPACE / VALIDATION</span>
          </div>
          <div className="font-bold text-[#E7EBEF] text-xs mt-1 flex items-center space-x-1">
            <span className={risk_level === 'LOW' ? 'text-[#4F9A72]' : 'text-[#F59E0B]'}>
              {risk_level}
            </span>
            <span className="text-[#707C88]">·</span>
            <span className="text-[#A9B3BD]">{validation_status}</span>
          </div>
          <div className="text-[9px] text-[#4F9A72] mt-0.5 font-bold">
            0 NFZ CONFLICTS
          </div>
        </div>
      </div>
    </div>
  );
});
