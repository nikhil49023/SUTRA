import React, { useState, memo } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useMissionStore } from '../../stores/missionStore';
import { useFleetStore } from '../../stores/fleetStore';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { useAIStore } from '../../stores/aiStore';
import { useGeofenceStore } from '../../stores/geofenceStore';
import { useGeofenceNotificationStore } from '../../geofence/GeofenceNotificationStore';
import { useAuthStore } from '../../security/authStore';
import { useDefensiveUpgradesStore } from '../../stores/defensiveUpgradesStore';
import { ConnectionStatus } from '../../communication/ConnectionStatus';
import { SessionStatus } from '../../security/SessionStatus';
import { AuditViewModal } from '../../security/AuditViewModal';
import {
  ShieldAlert,
  Shield,
  Battery,
  Satellite,
  Brain,
  FileText,
  AlertOctagon,
  AlertTriangle,
  Clock,
  LifeBuoy,
  BatteryCharging,
  Cpu,
  Sliders,
  Flame,
  Radio,
  Activity,
  ShieldCheck,
  Layers,
} from 'lucide-react';

export const TopBar: React.FC = memo(() => {
  const setEmergencyModalOpen = useAppStore((s) => s.setEmergencyModalOpen);
  const missionName = useMissionStore((s) => s.mission_name);
  const missionState = useMissionStore((s) => s.state);
  const drones = useFleetStore((s) => s.drones);
  const getTelemetry = useTelemetryStore((s) => s.getTelemetry);
  const aiMode = useAIStore((s) => s.mode);
  const role = useAuthStore((s) => s.role);

  // Operations vs Engineering Mode Toggle
  const viewMode = useAppStore((s) => s.viewMode);
  const toggleViewMode = useAppStore((s) => s.toggleViewMode);

  // Modals
  const setFailureLabOpen = useAppStore((s) => s.setFailureLabOpen);
  const setReplayOpen = useAppStore((s) => s.setReplayOpen);
  const setRescueHandoffOpen = useAppStore((s) => s.setRescueHandoffOpen);
  const setChargingLogisticsOpen = useAppStore((s) => s.setChargingLogisticsOpen);
  const setProvenanceOpen = useAppStore((s) => s.setProvenanceOpen);
  const setHalOpen = useAppStore((s) => s.setHalOpen);
  const setDegradationOpen = useAppStore((s) => s.setDegradationOpen);
  const setSafetyGateOpen = useAppStore((s) => s.setSafetyGateOpen);
  const setArchitectureBoundaryOpen = useAppStore((s) => s.setArchitectureBoundaryOpen);

  // Defensive Store
  const activeFailuresCount = useDefensiveUpgradesStore((s) => Object.keys(s.activeFailures).length);
  const rescueReports = useDefensiveUpgradesStore((s) => s.rescueReports);
  const halPlatform = useDefensiveUpgradesStore((s) => s.halState.active_platform);

  const [showAuditModal, setShowAuditModal] = useState(false);

  const telem = getTelemetry();
  const droneList = Object.values(drones);
  const lowestBattery = droneList.length
    ? Math.min(...droneList.map((d) => d.battery))
    : 100;

  const activeRedZoneCount = useGeofenceNotificationStore((s) =>
    s.notifications.filter((n) => n.severity === 'CRITICAL_RED_ZONE' && !n.acknowledged).length
  );

  return (
    <header className="h-12 bg-[#0B0F14] border-b border-[#2B3743] px-3 sm:px-4 flex items-center justify-between text-[#E7EBEF] font-mono text-xs select-none shadow-md z-40 flex-shrink-0">
      {/* 1. Left: Brand & Mission & Mode Switcher */}
      <div className="flex items-center space-x-2.5 sm:space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-[2px] bg-[#5B8FB9] shadow-[0_0_8px_rgba(91,143,185,0.4)]" />
          <span className="font-extrabold text-sm tracking-wider text-[#E7EBEF]">
            SUTRA
          </span>
          <span className="text-[10px] text-[#707C88] font-bold border border-[#2B3743] px-1.5 py-0.5 rounded bg-[#11171E] leading-none">
            GCS
          </span>
        </div>

        {/* 👨‍🚒 OPERATIONS MODE vs 🧪 ENGINEERING MODE SWITCHER */}
        <button
          onClick={toggleViewMode}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md border font-extrabold text-[10px] transition shadow-md cursor-pointer ${
            viewMode === 'OPERATIONS'
              ? 'bg-[#10B981]/20 border-[#10B981]/80 text-[#10B981] hover:bg-[#10B981]/30'
              : 'bg-[#3B82F6]/20 border-[#3B82F6]/80 text-[#3B82F6] hover:bg-[#3B82F6]/30'
          }`}
          title="Switch between Clean Operations Mode and Deep Engineering Mode"
        >
          {viewMode === 'OPERATIONS' ? (
            <>
              <span>👨‍🚒 OPERATIONS MODE</span>
              <span className="text-[8px] px-1 py-0.2 rounded bg-[#10B981] text-black font-extrabold">TACTICAL</span>
            </>
          ) : (
            <>
              <span>🧪 ENGINEERING MODE</span>
              <span className="text-[8px] px-1 py-0.2 rounded bg-[#3B82F6] text-white font-extrabold">AVIONICS</span>
            </>
          )}
        </button>

        <div className="h-4 w-px bg-[#2B3743] hidden md:block" />

        {/* Mission Status Badge */}
        <div className="hidden lg:flex items-center space-x-2">
          <span className="text-[#707C88] text-[11px]">MISSION:</span>
          <span className="font-bold text-[#E7EBEF] truncate max-w-[120px]">{missionName}</span>
          <span className="px-1.5 py-0.5 rounded border border-[#4F9A72]/40 bg-[#151D26] text-[#4F9A72] text-[10px] font-bold flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F9A72] animate-pulse" />
            <span>{missionState}</span>
          </span>
        </div>
      </div>

      {/* 2. Middle: Dynamic Context Stats Based on Mode */}
      <div className="hidden xl:flex items-center space-x-2">
        {viewMode === 'OPERATIONS' ? (
          /* 👨‍🚒 OPERATIONS MODE METRICS (Risk → UAVs → Survivors → Hazards → Battery → Comms → Alerts) */
          <>
            {/* Risk */}
            <div className="flex items-center space-x-1.5 bg-[#11171E] px-2 py-1 rounded border border-[#2B3743]">
              <span className="text-[#707C88]">RISK:</span>
              <span className="font-extrabold text-[#F59E0B]">84.5 ELEVATED</span>
            </div>

            {/* UAVs */}
            <div className="flex items-center space-x-1.5 bg-[#11171E] px-2 py-1 rounded border border-[#2B3743]">
              <span className="text-[#707C88]">UAVs:</span>
              <span className="font-bold text-[#E7EBEF]">{droneList.length} ACTIVE</span>
            </div>

            {/* Survivors (Quick Handoff trigger) */}
            <button
              onClick={() => setRescueHandoffOpen(true)}
              className="flex items-center space-x-1.5 bg-[#10B981]/15 hover:bg-[#10B981]/25 px-2.5 py-1 rounded border border-[#10B981]/40 text-[#10B981] font-bold cursor-pointer transition shadow-[0_0_8px_rgba(16,185,129,0.2)]"
              title="Open Ground Rescue Coordination Handoff"
            >
              <LifeBuoy className="w-3.5 h-3.5 animate-pulse" />
              <span>{rescueReports.length} SURVIVORS</span>
            </button>

            {/* Hazards */}
            <div className="flex items-center space-x-1.5 bg-[#11171E] px-2 py-1 rounded border border-[#2B3743]">
              <Flame className="w-3 h-3 text-[#EF4444]" />
              <span className="text-[#707C88]">HAZARDS:</span>
              <span className="font-bold text-[#EF4444]">3 ACTIVE</span>
            </div>

            {/* Battery */}
            <div className="flex items-center space-x-1.5 bg-[#11171E] px-2 py-1 rounded border border-[#2B3743]">
              <Battery className="w-3.5 h-3.5 text-[#10B981]" />
              <span className="text-[#707C88]">BAT:</span>
              <span className="font-bold text-[#10B981]">{lowestBattery.toFixed(0)}%</span>
            </div>

            {/* Comms */}
            <div className="flex items-center space-x-1.5 bg-[#11171E] px-2 py-1 rounded border border-[#2B3743]">
              <Radio className="w-3.5 h-3.5 text-[#5B8FB9]" />
              <span className="text-[#707C88]">COMMS:</span>
              <span className="font-bold text-[#5B8FB9]">98.4% PDR</span>
            </div>
          </>
        ) : (
          /* 🧪 ENGINEERING MODE METRICS (ORCA Latency → Covariance → SNR → Setpoint Freq → PX4 State → Solver) */
          <>
            <div className="flex items-center space-x-1 bg-[#11171E] px-2 py-1 rounded border border-[#2B3743] text-[11px]">
              <span className="text-[#707C88]">ORCA:</span>
              <span className="font-bold text-[#10B981]">0.82ms</span>
            </div>

            <div className="flex items-center space-x-1 bg-[#11171E] px-2 py-1 rounded border border-[#2B3743] text-[11px]">
              <span className="text-[#707C88]">COV(P):</span>
              <span className="font-bold text-[#5B8FB9]">0.012m²</span>
            </div>

            <div className="flex items-center space-x-1 bg-[#11171E] px-2 py-1 rounded border border-[#2B3743] text-[11px]">
              <span className="text-[#707C88]">SNR:</span>
              <span className="font-bold text-[#10B981]">28.4dB</span>
            </div>

            <div className="flex items-center space-x-1 bg-[#11171E] px-2 py-1 rounded border border-[#2B3743] text-[11px]">
              <span className="text-[#707C88]">FREQ:</span>
              <span className="font-bold text-[#5B8FB9]">50.0Hz</span>
            </div>

            <div className="flex items-center space-x-1 bg-[#11171E] px-2 py-1 rounded border border-[#2B3743] text-[11px]">
              <span className="text-[#707C88]">HAL:</span>
              <span className="font-extrabold text-[#EAB308]">{halPlatform}</span>
            </div>

            <div className="flex items-center space-x-1 bg-[#11171E] px-2 py-1 rounded border border-[#2B3743] text-[11px]">
              <span className="text-[#707C88]">SOLVER:</span>
              <span className="font-bold text-[#10B981]">VO-3D</span>
            </div>
          </>
        )}
      </div>

      {/* 3. Right: Defensive Action Buttons, Audit, Emergency RTL */}
      <div className="flex items-center space-x-1.5 sm:space-x-2">
        {/* Priority 1: SUTRA Failure Lab */}
        <button
          onClick={() => setFailureLabOpen(true)}
          className={`px-2.5 py-1 rounded border font-extrabold text-[10px] flex items-center space-x-1 transition cursor-pointer ${
            activeFailuresCount > 0
              ? 'bg-[#1C0F13] border-[#EF4444] text-[#EF4444] animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.4)]'
              : 'bg-[#151D26] hover:bg-[#1B2530] border-[#C75A5A]/60 text-[#EF4444] hover:border-[#EF4444]'
          }`}
          title="Open SUTRA Failure Lab (Chaos Fault Injection)"
        >
          <AlertTriangle className="w-3 h-3" />
          <span>FAILURE LAB</span>
          {activeFailuresCount > 0 && (
            <span className="px-1 py-0.2 rounded-full bg-[#EF4444] text-white text-[8px] font-black">
              {activeFailuresCount}
            </span>
          )}
        </button>

        {/* Priority 2: Mission Replay AAR */}
        <button
          onClick={() => setReplayOpen(true)}
          className="px-2 py-1 rounded bg-[#11171E] hover:bg-[#151D26] border border-[#2B3743] hover:border-[#5B8FB9] text-[#5B8FB9] text-[10px] font-bold flex items-center space-x-1 transition cursor-pointer"
          title="Open Mission Replay & After-Action Review"
        >
          <Clock className="w-3 h-3" />
          <span className="hidden sm:inline">REPLAY</span>
        </button>

        {/* Priority 5: Multi-Station Charging */}
        <button
          onClick={() => setChargingLogisticsOpen(true)}
          className="px-2 py-1 rounded bg-[#11171E] hover:bg-[#151D26] border border-[#2B3743] hover:border-[#F59E0B] text-[#F59E0B] text-[10px] font-bold flex items-center space-x-1 transition cursor-pointer"
          title="Multi-Station Logistics & Dynamic Charging Optimizer"
        >
          <BatteryCharging className="w-3 h-3" />
          <span className="hidden sm:inline">CHARGERS</span>
        </button>

        {/* Priority 6: Decision Provenance */}
        <button
          onClick={() => setProvenanceOpen(true)}
          className="px-2 py-1 rounded bg-[#11171E] hover:bg-[#151D26] border border-[#2B3743] hover:border-[#8B5CF6] text-[#8B5CF6] text-[10px] font-bold flex items-center space-x-1 transition cursor-pointer"
          title="Why Did SUTRA Do This? (Decision Provenance)"
        >
          <Brain className="w-3 h-3" />
          <span className="hidden sm:inline">WHY?</span>
        </button>

        {/* Priority 7: HAL */}
        <button
          onClick={() => setHalOpen(true)}
          className="px-2 py-1 rounded bg-[#11171E] hover:bg-[#151D26] border border-[#2B3743] hover:border-[#EAB308] text-[#EAB308] text-[10px] font-bold flex items-center space-x-1 transition cursor-pointer"
          title="Hardware Abstraction Layer (PX4/ArduPilot/Sim)"
        >
          <Cpu className="w-3 h-3" />
          <span className="hidden sm:inline">HAL</span>
        </button>

        {/* Priority 3: Sensor Degradation */}
        <button
          onClick={() => setDegradationOpen(true)}
          className="px-2 py-1 rounded bg-[#11171E] hover:bg-[#151D26] border border-[#2B3743] hover:border-[#3B82F6] text-[#3B82F6] text-[10px] font-bold flex items-center space-x-1 transition cursor-pointer"
          title="Simulate Realistic Sensor Uncertainty (Rain, Drift, RF Loss)"
        >
          <Sliders className="w-3 h-3" />
          <span className="hidden sm:inline">DEGRADE</span>
        </button>

        {/* Mission Safety Gate (Pre-Execution Interlock) */}
        <button
          onClick={() => setSafetyGateOpen(true)}
          className="px-2.5 py-1 rounded bg-[#10B981]/15 hover:bg-[#10B981]/25 border border-[#10B981]/60 hover:border-[#10B981] text-[#10B981] text-[10px] font-extrabold flex items-center space-x-1 transition cursor-pointer shadow-[0_0_8px_rgba(16,185,129,0.2)]"
          title="Pre-Execution Swarm Mission Safety Gate (7 Interlock Checks)"
        >
          <ShieldCheck className="w-3 h-3" />
          <span className="hidden md:inline">SAFETY GATE</span>
        </button>

        {/* Defensible Architecture Reality Boundary */}
        <button
          onClick={() => setArchitectureBoundaryOpen(true)}
          className="px-2 py-1 rounded bg-[#11171E] hover:bg-[#151D26] border border-[#2B3743] hover:border-[#10B981] text-[#A9B3BD] hover:text-[#10B981] text-[10px] font-bold flex items-center space-x-1 transition cursor-pointer"
          title="Defensible Reality Boundary: Real Algorithmic Core vs. Simulated Environment"
        >
          <Layers className="w-3 h-3" />
          <span className="hidden lg:inline">BOUNDARY</span>
        </button>

        {/* Connection status */}
        <ConnectionStatus />

        {/* Emergency RTL Button */}
        <button
          onClick={() => setEmergencyModalOpen(true, 'ALL')}
          className="px-2.5 py-1.5 rounded bg-[#C75A5A] border border-[#C75A5A] hover:bg-[#b04f4f] text-white font-bold text-xs tracking-wider flex items-center space-x-1.5 transition shadow-[0_0_12px_rgba(199,90,90,0.3)] active:scale-95 flex-shrink-0"
        >
          <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
          <span className="hidden md:inline">EMERGENCY RTL</span>
        </button>
      </div>

      {/* Audit Log Modal */}
      <AuditViewModal isOpen={showAuditModal} onClose={() => setShowAuditModal(false)} />
    </header>
  );
});
