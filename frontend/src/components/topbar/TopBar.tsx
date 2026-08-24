import React, { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useMissionStore } from '../../stores/missionStore';
import { useFleetStore } from '../../stores/fleetStore';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { useAIStore } from '../../stores/aiStore';
import { useAuthStore } from '../../security/authStore';
import { ConnectionStatus } from '../../communication/ConnectionStatus';
import { SessionStatus } from '../../security/SessionStatus';
import { AuditViewModal } from '../../security/AuditViewModal';
import { ShieldAlert, Battery, Satellite, Activity, Brain, FileText } from 'lucide-react';

export const TopBar: React.FC = () => {
  const { setEmergencyModalOpen } = useAppStore();
  const { mission_name, state } = useMissionStore();
  const { drones } = useFleetStore();
  const { getTelemetry } = useTelemetryStore();
  const { mode: aiMode } = useAIStore();
  const { role } = useAuthStore();
  const [showAuditModal, setShowAuditModal] = useState(false);

  const telem = getTelemetry();
  const droneList = Object.values(drones);
  const lowestBattery = droneList.length
    ? Math.min(...droneList.map((d) => d.battery))
    : 100;

  return (
    <header className="h-12 bg-[#090d14] border-b border-slate-800/90 px-4 flex items-center justify-between text-slate-100 font-mono text-xs select-none shadow-md z-40">
      {/* 1. Left: Brand & Mission Name */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-sm bg-cyan-400 shadow-[0_0_8px_rgba(0,229,255,0.8)]" />
          <span className="font-extrabold text-sm tracking-wider bg-gradient-to-r from-cyan-400 to-sky-200 bg-clip-text text-transparent">
            SMART HORIZON
          </span>
          <span className="text-[10px] text-slate-500 font-bold border border-slate-800 px-1 rounded bg-slate-950">
            GCS
          </span>
        </div>

        <div className="h-4 w-px bg-slate-800" />

        {/* Mission Status Badge */}
        <div className="flex items-center space-x-2">
          <span className="text-slate-400 text-[11px]">MISSION:</span>
          <span className="font-bold text-cyan-300">{mission_name}</span>
          <span className="px-1.5 py-0.2 rounded border border-emerald-500/40 bg-emerald-950/50 text-emerald-400 text-[10px] font-bold flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{state}</span>
          </span>
        </div>
      </div>

      {/* 2. Middle: Fleet Summary & Telemetry Quick Stats */}
      <div className="hidden lg:flex items-center space-x-3">
        {/* Fleet Count */}
        <div className="flex items-center space-x-1.5 bg-slate-900/60 px-2 py-1 rounded border border-slate-800">
          <span className="text-slate-400">FLEET:</span>
          <span className="font-bold text-cyan-300 tabular-nums">{droneList.length} UAVs</span>
        </div>

        {/* GPS Satellites */}
        <div className="flex items-center space-x-1.5 bg-slate-900/60 px-2 py-1 rounded border border-slate-800">
          <Satellite className="w-3 h-3 text-cyan-400" />
          <span className="font-bold text-slate-200 tabular-nums">{telem?.satellites || 18} SAT</span>
        </div>

        {/* Battery Summary */}
        <div className="flex items-center space-x-1.5 bg-slate-900/60 px-2 py-1 rounded border border-slate-800">
          <Battery className="w-3 h-3 text-emerald-400" />
          <span className="text-slate-400">BAT:</span>
          <span className={`font-bold tabular-nums ${lowestBattery <= 20 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {lowestBattery.toFixed(0)}%
          </span>
        </div>

        {/* AI Status */}
        <div className="flex items-center space-x-1.5 bg-slate-900/60 px-2 py-1 rounded border border-slate-800">
          <Brain className="w-3 h-3 text-purple-400" />
          <span className="text-purple-300 font-bold">AI {aiMode}</span>
        </div>
      </div>

      {/* 3. Right: Operator Session, Audit Viewer, Latency & Emergency Button */}
      <div className="flex items-center space-x-2.5">
        {/* Operator Security Indicator & Login Modal */}
        <SessionStatus />

        {/* Audit Log Viewer Trigger (Admin & Commander) */}
        {(role === 'ADMIN' || role === 'COMMANDER') && (
          <button
            onClick={() => setShowAuditModal(true)}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-cyan-950/40 text-slate-300 hover:text-cyan-200 text-[10px] flex items-center space-x-1 transition"
            title="Open Authoritative Security Audit Log"
          >
            <FileText className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">AUDIT</span>
          </button>
        )}

        <ConnectionStatus />

        {/* Prominent EMERGENCY RTL Button */}
        <button
          onClick={() => setEmergencyModalOpen(true, 'ALL')}
          className="px-3 py-1.5 rounded bg-rose-600 border border-rose-400 hover:bg-rose-500 text-white font-bold text-xs tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.4)] flex items-center space-x-1.5 transition active:scale-95"
        >
          <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
          <span>EMERGENCY RTL</span>
        </button>
      </div>

      {/* Audit Log Modal */}
      <AuditViewModal isOpen={showAuditModal} onClose={() => setShowAuditModal(false)} />
    </header>
  );
};
