import React, { useState, memo } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useMissionStore } from '../../stores/missionStore';
import { useFleetStore } from '../../stores/fleetStore';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { useAIStore } from '../../stores/aiStore';
import { useGeofenceStore } from '../../stores/geofenceStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { useAuthStore } from '../../security/authStore';
import { ConnectionStatus } from '../../communication/ConnectionStatus';
import { SessionStatus } from '../../security/SessionStatus';
import { AuditViewModal } from '../../security/AuditViewModal';
import { ShieldAlert, Shield, Battery, Satellite, Brain, FileText } from 'lucide-react';

export const TopBar: React.FC = memo(() => {
  const setEmergencyModalOpen = useAppStore((s) => s.setEmergencyModalOpen);
  const missionName = useMissionStore((s) => s.mission_name);
  const missionState = useMissionStore((s) => s.state);
  const drones = useFleetStore((s) => s.drones);
  const getTelemetry = useTelemetryStore((s) => s.getTelemetry);
  const aiMode = useAIStore((s) => s.mode);
  const role = useAuthStore((s) => s.role);
  const [showAuditModal, setShowAuditModal] = useState(false);

  const telem = getTelemetry();
  const droneList = Object.values(drones);
  const lowestBattery = droneList.length
    ? Math.min(...droneList.map((d) => d.battery))
    : 100;

  return (
    <header className="h-12 bg-[#0B0F14] border-b border-[#2B3743] px-3 sm:px-4 flex items-center justify-between text-[#E7EBEF] font-mono text-xs select-none shadow-md z-40 flex-shrink-0">
      {/* 1. Left: Brand & Mission Name */}
      <div className="flex items-center space-x-2.5 sm:space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-[2px] bg-[#5B8FB9] shadow-[0_0_8px_rgba(91,143,185,0.4)]" />
          <span className="font-extrabold text-sm tracking-wider text-[#E7EBEF]">
            VAAYU SWARM
          </span>
          <span className="text-[10px] text-[#707C88] font-bold border border-[#2B3743] px-1.5 py-0.5 rounded bg-[#11171E] leading-none">
            GCS
          </span>
        </div>

        <div className="h-4 w-px bg-[#2B3743]" />

        {/* Mission Status Badge */}
        <div className="flex items-center space-x-2">
          <span className="text-[#707C88] text-[11px] hidden sm:inline">MISSION:</span>
          <span className="font-bold text-[#E7EBEF] truncate max-w-[120px] sm:max-w-[180px]">{missionName}</span>
          <span className="px-2 py-0.5 rounded border border-[#4F9A72]/40 bg-[#151D26] text-[#4F9A72] text-[10px] font-bold flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F9A72] animate-pulse" />
            <span>{missionState}</span>
          </span>
        </div>
      </div>

      {/* 2. Middle: Fleet Summary & Telemetry Quick Stats */}
      <div className="hidden xl:flex items-center space-x-2">
        {/* Fleet Count */}
        <div className="flex items-center space-x-1.5 bg-[#11171E] px-2.5 py-1 rounded border border-[#2B3743]">
          <span className="text-[#707C88]">FLEET:</span>
          <span className="font-bold text-[#E7EBEF] tabular-nums">{droneList.length} UAVs</span>
          <div className="flex items-center space-x-0.5 ml-1">
            {droneList.map((d) => (
              <span
                key={d.drone_id}
                title={`${d.callsign}: ${d.battery.toFixed(0)}%`}
                className={`w-1.5 h-1.5 rounded-full ${
                  d.battery <= 20 ? 'bg-[#C75A5A]' : d.battery <= 40 ? 'bg-[#C49A4A]' : 'bg-[#4F9A72]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* GPS Satellites */}
        <div className="flex items-center space-x-1.5 bg-[#11171E] px-2.5 py-1 rounded border border-[#2B3743]">
          <Satellite className="w-3.5 h-3.5 text-[#5B8FB9]" />
          <span className="font-bold text-[#E7EBEF] tabular-nums">{telem?.satellites || 18} SAT</span>
        </div>

        {/* Battery Summary */}
        <div className="flex items-center space-x-1.5 bg-[#11171E] px-2.5 py-1 rounded border border-[#2B3743]">
          <Battery className={`w-3.5 h-3.5 ${lowestBattery <= 20 ? 'text-[#C75A5A]' : lowestBattery <= 40 ? 'text-[#C49A4A]' : 'text-[#4F9A72]'}`} />
          <span className="text-[#707C88]">MIN BAT:</span>
          <span className={`font-bold tabular-nums ${lowestBattery <= 20 ? 'text-[#C75A5A]' : lowestBattery <= 40 ? 'text-[#C49A4A]' : 'text-[#4F9A72]'}`}>
            {lowestBattery.toFixed(0)}%
          </span>
        </div>

        {/* Geofences & Edit Button */}
        <button
          onClick={() => {
            const gfs = useGeofenceStore.getState().geofences;
            useAppStore.getState().setInspectorOpen(true);
            if (gfs.length > 0) {
              useSelectionStore.getState().selectGeofence(gfs[0].id);
            } else {
              useSelectionStore.getState().selectObject('GEOFENCE', null);
            }
          }}
          className="flex items-center space-x-1.5 bg-[#11171E] hover:bg-[#1B2530] px-2.5 py-1 rounded border border-[#2B3743] hover:border-[#5B8FB9] transition cursor-pointer"
          title="Access & Edit Geofences"
        >
          <Shield className="w-3.5 h-3.5 text-[#5B8FB9]" />
          <span className="text-[#707C88]">FENCE:</span>
          <span className="font-bold text-[#E7EBEF] tabular-nums">{useGeofenceStore.getState().geofences.length}</span>
          <span className="text-[9px] px-1 py-0.2 rounded bg-[#1B2530] text-[#5B8FB9] font-bold border border-[#5B8FB9]/40 ml-0.5">
            EDIT
          </span>
        </button>

        {/* AI Status */}
        <div className="flex items-center space-x-1.5 bg-[#11171E] px-2.5 py-1 rounded border border-[#2B3743]">
          <Brain className="w-3.5 h-3.5 text-[#5B8FB9]" />
          <span className="text-[#A9B3BD] font-bold">AI {aiMode}</span>
        </div>
      </div>

      {/* 3. Right: Operator Session, Audit Viewer, Latency & Emergency Button */}
      <div className="flex items-center space-x-2">
        {/* Operator Security Indicator & Login Modal */}
        <SessionStatus />

        {/* Audit Log Viewer Trigger (Admin & Commander) */}
        {(role === 'ADMIN' || role === 'COMMANDER') && (
          <button
            onClick={() => setShowAuditModal(true)}
            className="px-2.5 py-1 rounded bg-[#11171E] border border-[#2B3743] hover:border-[#5B8FB9] hover:bg-[#151D26] text-[#A9B3BD] hover:text-[#E7EBEF] text-[10px] font-bold flex items-center space-x-1.5 transition"
            title="Open Authoritative Security Audit Log"
          >
            <FileText className="w-3 h-3 text-[#5B8FB9]" />
            <span className="hidden md:inline">AUDIT</span>
          </button>
        )}

        <ConnectionStatus />

        {/* Prominent EMERGENCY RTL Button */}
        <button
          onClick={() => setEmergencyModalOpen(true, 'ALL')}
          className="px-3 py-1.5 rounded bg-[#C75A5A] border border-[#C75A5A] hover:bg-[#b04f4f] text-white font-bold text-xs tracking-wider flex items-center space-x-1.5 transition shadow-[0_0_12px_rgba(199,90,90,0.3)] active:scale-95 flex-shrink-0"
        >
          <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
          <span>EMERGENCY RTL</span>
        </button>
      </div>

      {/* Audit Log Modal */}
      <AuditViewModal isOpen={showAuditModal} onClose={() => setShowAuditModal(false)} />
    </header>
  );
});
