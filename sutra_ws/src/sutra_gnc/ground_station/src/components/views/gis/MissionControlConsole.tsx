import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Shield,
  ShieldCheck,
  PlaneTakeoff,
  PlaneLanding,
  RotateCcw as RTLIcon,
  AlertTriangle,
  Compass,
  Battery,
  Navigation2,
  Gauge
} from 'lucide-react';
import type { Waypoint, DroneAsset, TelemetryData } from '../../../types';

export type UAVMissionState =
  | 'IDLE'
  | 'ARMED'
  | 'READY'
  | 'TAKEOFF'
  | 'EXECUTING'
  | 'PAUSED'
  | 'RTL'
  | 'LANDING'
  | 'COMPLETED'
  | 'ABORTED';

interface MissionControlConsoleProps {
  missionState: UAVMissionState;
  activeDrone: DroneAsset;
  telemetry: TelemetryData;
  waypoints: Waypoint[];
  activeWaypointIdx: number;
  remainingDistanceKm: number;
  etaSeconds: number;
  onArm: () => void;
  onDisarm: () => void;
  onTakeoff: () => void;
  onStartMission: () => void;
  onPauseMission: () => void;
  onResumeMission: () => void;
  onRTH: () => void;
  onLand: () => void;
  onAbort: () => void;
  onReset: () => void;
}

export const MissionControlConsole: React.FC<MissionControlConsoleProps> = ({
  missionState,
  activeDrone,
  telemetry,
  waypoints,
  activeWaypointIdx,
  remainingDistanceKm,
  etaSeconds,
  onArm,
  onDisarm,
  onTakeoff,
  onStartMission,
  onPauseMission,
  onResumeMission,
  onRTH,
  onLand,
  onAbort,
  onReset
}) => {
  const progressPercent = waypoints.length > 0
    ? Math.min(100, Math.round(((activeWaypointIdx + 1) / waypoints.length) * 100))
    : 0;

  const formatETA = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getStateColor = (state: UAVMissionState) => {
    switch (state) {
      case 'ARMED': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'READY': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'TAKEOFF':
      case 'EXECUTING': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 animate-pulse';
      case 'PAUSED': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'RTL':
      case 'LANDING': return 'text-rose-400 bg-rose-500/10 border-rose-500/30 animate-pulse';
      case 'COMPLETED': return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/50';
      case 'ABORTED': return 'text-rose-500 bg-rose-500/20 border-rose-500/50';
      default: return 'text-slate-400 bg-slate-800/50 border-slate-700';
    }
  };

  // State Machine Validation Interlocks
  const canArm = missionState === 'IDLE';
  const canDisarm = missionState === 'ARMED' || missionState === 'READY' || missionState === 'PAUSED';
  const canTakeoff = missionState === 'ARMED' || missionState === 'READY';
  const canStart = (missionState === 'ARMED' || missionState === 'READY' || missionState === 'TAKEOFF') && waypoints.length > 0;
  const canPause = missionState === 'EXECUTING';
  const canResume = missionState === 'PAUSED';
  const canRTL = missionState === 'EXECUTING' || missionState === 'PAUSED' || missionState === 'TAKEOFF';
  const canLand = missionState === 'EXECUTING' || missionState === 'PAUSED' || missionState === 'RTL';
  const canAbort = missionState === 'EXECUTING' || missionState === 'PAUSED' || missionState === 'TAKEOFF';
  const canReset = missionState === 'COMPLETED' || missionState === 'ABORTED' || missionState === 'PAUSED';

  return (
    <div className="w-84 bg-[#090e18]/95 border border-[#1a2336] backdrop-blur-md p-3.5 rounded-xl shadow-2xl space-y-3 font-mono">
      {/* HEADER & STATE BADGE */}
      <div className="flex items-center justify-between border-b border-[#1a2336] pb-2">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Mission Console</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStateColor(missionState)}`}>
          {missionState}
        </span>
      </div>

      {/* PROGRESS BAR & WAYPOINT MATRIX */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-400">PROGRESS</span>
          <span className="text-cyan-400 font-bold">
            WP {waypoints.length > 0 ? activeWaypointIdx + 1 : 0} / {waypoints.length} ({progressPercent}%)
          </span>
        </div>
        <div className="w-full bg-[#101726] h-1.5 rounded-full overflow-hidden border border-[#1e293b]">
          <div
            className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* TELEMETRY READOUT GRID */}
      <div className="grid grid-cols-2 gap-1.5 text-[10px] bg-[#050912]/80 p-2 rounded-lg border border-[#162032]">
        <div className="flex items-center space-x-1.5 text-slate-300">
          <Gauge className="w-3 h-3 text-cyan-400" />
          <span>SPD: <strong className="text-cyan-300">{activeDrone.groundSpeed || 0} km/h</strong></span>
        </div>
        <div className="flex items-center space-x-1.5 text-slate-300">
          <Navigation2 className="w-3 h-3 text-emerald-400" />
          <span>ALT: <strong className="text-emerald-300">{activeDrone.altitude || 0}m AGL</strong></span>
        </div>
        <div className="flex items-center space-x-1.5 text-slate-300">
          <Compass className="w-3 h-3 text-amber-400" />
          <span>HDG: <strong className="text-amber-300">{activeDrone.heading || 0}°</strong></span>
        </div>
        <div className="flex items-center space-x-1.5 text-slate-300">
          <Battery className="w-3 h-3 text-rose-400" />
          <span>BAT: <strong className="text-rose-300">{activeDrone.battery || 88}%</strong></span>
        </div>
        <div className="flex items-center space-x-1.5 text-slate-300 col-span-2 border-t border-[#141e30] pt-1 mt-0.5">
          <span className="text-slate-400">DIST: <strong className="text-cyan-400">{remainingDistanceKm.toFixed(2)} km</strong></span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">ETA: <strong className="text-emerald-400">{formatETA(etaSeconds)}</strong></span>
        </div>
      </div>

      {/* COMMAND BUTTON MATRIX WITH STATE VALIDATION INTERLOCKS */}
      <div className="grid grid-cols-2 gap-1.5 pt-1">
        {/* Arm / Disarm */}
        {canArm ? (
          <button
            onClick={onArm}
            className="flex items-center justify-center space-x-1 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold transition-all"
          >
            <ShieldCheck className="w-3 h-3 text-amber-400" />
            <span>ARM DRONE</span>
          </button>
        ) : (
          <button
            onClick={onDisarm}
            disabled={!canDisarm}
            className={`flex items-center justify-center space-x-1 py-1.5 rounded text-[10px] font-bold border transition-all ${
              canDisarm
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600'
                : 'bg-slate-900/40 text-slate-600 border-slate-800/40 cursor-not-allowed'
            }`}
          >
            <span>DISARM</span>
          </button>
        )}

        {/* Takeoff */}
        <button
          onClick={onTakeoff}
          disabled={!canTakeoff}
          className={`flex items-center justify-center space-x-1 py-1.5 rounded text-[10px] font-bold border transition-all ${
            canTakeoff
              ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
              : 'bg-slate-900/40 text-slate-600 border-slate-800/40 cursor-not-allowed'
          }`}
        >
          <PlaneTakeoff className="w-3 h-3" />
          <span>TAKEOFF</span>
        </button>

        {/* Start / Pause / Resume Mission */}
        {missionState === 'PAUSED' ? (
          <button
            onClick={onResumeMission}
            disabled={!canResume}
            className="col-span-2 flex items-center justify-center space-x-1.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 rounded text-xs font-bold transition-all shadow-[0_0_12px_#00e67633]"
          >
            <Play className="w-3.5 h-3.5" />
            <span>RESUME MISSION</span>
          </button>
        ) : missionState === 'EXECUTING' ? (
          <button
            onClick={onPauseMission}
            disabled={!canPause}
            className="col-span-2 flex items-center justify-center space-x-1.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 rounded text-xs font-bold transition-all"
          >
            <Pause className="w-3.5 h-3.5" />
            <span>PAUSE MISSION</span>
          </button>
        ) : (
          <button
            onClick={onStartMission}
            disabled={!canStart}
            className={`col-span-2 flex items-center justify-center space-x-1.5 py-2 rounded text-xs font-bold border transition-all ${
              canStart
                ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 shadow-[0_0_12px_#00f0ff33]'
                : 'bg-slate-900/40 text-slate-600 border-slate-800/40 cursor-not-allowed'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>START MISSION</span>
          </button>
        )}

        {/* RTL */}
        <button
          onClick={onRTH}
          disabled={!canRTL}
          className={`flex items-center justify-center space-x-1 py-1.5 rounded text-[10px] font-bold border transition-all ${
            canRTL
              ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
              : 'bg-slate-900/40 text-slate-600 border-slate-800/40 cursor-not-allowed'
          }`}
        >
          <RTLIcon className="w-3 h-3" />
          <span>RTL</span>
        </button>

        {/* Land */}
        <button
          onClick={onLand}
          disabled={!canLand}
          className={`flex items-center justify-center space-x-1 py-1.5 rounded text-[10px] font-bold border transition-all ${
            canLand
              ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
              : 'bg-slate-900/40 text-slate-600 border-slate-800/40 cursor-not-allowed'
          }`}
        >
          <PlaneLanding className="w-3 h-3" />
          <span>LAND</span>
        </button>

        {/* Emergency Abort & Reset */}
        <button
          onClick={onAbort}
          disabled={!canAbort}
          className={`flex items-center justify-center space-x-1 py-1.5 rounded text-[10px] font-bold border transition-all ${
            canAbort
              ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-500'
              : 'bg-slate-900/40 text-slate-600 border-slate-800/40 cursor-not-allowed'
          }`}
        >
          <AlertTriangle className="w-3 h-3" />
          <span>ABORT</span>
        </button>

        <button
          onClick={onReset}
          disabled={!canReset}
          className={`flex items-center justify-center space-x-1 py-1.5 rounded text-[10px] font-bold border transition-all ${
            canReset
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600'
              : 'bg-slate-900/40 text-slate-600 border-slate-800/40 cursor-not-allowed'
          }`}
        >
          <RotateCcw className="w-3 h-3" />
          <span>RESET</span>
        </button>
      </div>
    </div>
  );
};
