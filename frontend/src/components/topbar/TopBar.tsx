import React, { useState, useRef, useEffect, memo } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useMissionStore } from '../../stores/missionStore';
import { useFleetStore } from '../../stores/fleetStore';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { useAuthStore } from '../../security/authStore';
import { useDefensiveUpgradesStore } from '../../stores/defensiveUpgradesStore';
import { ConnectionStatus } from '../../communication/ConnectionStatus';
import { SessionStatus } from '../../security/SessionStatus';
import { AuditViewModal } from '../../security/AuditViewModal';
import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  Battery,
  Flame,
  Radio,
  Clock,
  LifeBuoy,
  AlertTriangle,
  ChevronDown,
  Cpu,
  Sliders,
  BatteryCharging,
  Layers,
  Brain,
  Activity,
  Play,
  Pause,
  Compass,
} from 'lucide-react';

export const TopBar: React.FC = memo(() => {
  const setEmergencyModalOpen = useAppStore((s) => s.setEmergencyModalOpen);
  const missionName = useMissionStore((s) => s.mission_name);
  const missionState = useMissionStore((s) => s.state);
  const drones = useFleetStore((s) => s.drones);
  const getTelemetry = useTelemetryStore((s) => s.getTelemetry);

  // Operations vs Engineering Mode
  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);

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

  // UI state for dropdown
  const [labsDropdownOpen, setLabsDropdownOpen] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setLabsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const droneList = Object.values(drones);
  const lowestBattery = droneList.length
    ? Math.min(...droneList.map((d) => d.battery))
    : 100;

  return (
    <header className="h-12 bg-[#0B0F14] border-b border-[#2B3743] px-3 sm:px-4 flex items-center justify-between text-[#E7EBEF] font-mono text-xs select-none shadow-md z-40 flex-shrink-0 relative">
      {/* ── 1. LEFT ZONE: Brand, Segmented Mode Switcher, Mission Status ── */}
      <div className="flex items-center space-x-3">
        {/* Brand */}
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-[2px] bg-[#5B8FB9] shadow-[0_0_8px_rgba(91,143,185,0.6)]" />
          <span className="font-extrabold text-sm tracking-wider text-[#E7EBEF]">
            SUTRA
          </span>
          <span className="text-[9px] text-[#707C88] font-bold border border-[#2B3743] px-1.5 py-0.5 rounded bg-[#11171E] leading-none">
            GCS
          </span>
        </div>

        {/* Vertical Divider */}
        <div className="h-4 w-px bg-[#2B3743]" />

        {/* Segmented Mode Switcher (Apple/Aerospace style) */}
        <div className="flex items-center bg-[#11171E] p-0.5 rounded-lg border border-[#2B3743] shadow-inner">
          <button
            onClick={() => setViewMode('OPERATIONS')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold transition flex items-center space-x-1.5 cursor-pointer ${
              viewMode === 'OPERATIONS'
                ? 'bg-[#10B981] text-[#0B0F14] shadow-sm'
                : 'text-[#707C88] hover:text-[#E7EBEF]'
            }`}
            title="Switch to Operations Mode (Clean Incident Telemetry)"
          >
            <span>👨‍🚒 OPERATIONS</span>
          </button>
          <button
            onClick={() => setViewMode('ENGINEERING')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold transition flex items-center space-x-1.5 cursor-pointer ${
              viewMode === 'ENGINEERING'
                ? 'bg-[#3B82F6] text-white shadow-sm'
                : 'text-[#707C88] hover:text-[#E7EBEF]'
            }`}
            title="Switch to Engineering Mode (Deep Avionics & GNC)"
          >
            <span>🧪 ENGINEERING</span>
          </button>
        </div>

        {/* Mission Status Badge */}
        <div className="hidden lg:flex items-center space-x-2 pl-1">
          <span className="text-[#707C88] text-[10px]">MISSION:</span>
          <span className="font-bold text-[#E7EBEF] truncate max-w-[120px]">{missionName}</span>
          <span className="px-1.5 py-0.5 rounded border border-[#4F9A72]/40 bg-[#151D26] text-[#4F9A72] text-[10px] font-bold flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F9A72] animate-pulse" />
            <span>{missionState}</span>
          </span>
        </div>
      </div>

      {/* ── 2. CENTER ZONE: Telemetry Capsule (Unified, Symmetrical, Aligned) ── */}
      <div className="hidden xl:flex items-center justify-center flex-shrink">
        <div className="flex items-center bg-[#11171E] border border-[#2B3743] rounded-lg px-2.5 py-1 text-[10.5px] space-x-2.5 shadow-inner">
          {viewMode === 'OPERATIONS' ? (
            /* 👨‍🚒 Operations: Risk → Swarm → Survivors → Hazards → Battery → Comms */
            <>
              <div className="flex items-center space-x-1">
                <span className="text-[#707C88]">RISK:</span>
                <span className="font-extrabold text-[#F59E0B]">84.5</span>
              </div>

              <div className="w-px h-3.5 bg-[#2B3743]" />

              <div className="flex items-center space-x-1">
                <span className="text-[#707C88]">SWARM:</span>
                <span className="font-bold text-[#E7EBEF]">{droneList.length}</span>
              </div>

              <div className="w-px h-3.5 bg-[#2B3743]" />

              <button
                onClick={() => setRescueHandoffOpen(true)}
                className="flex items-center space-x-1 text-[#10B981] hover:underline cursor-pointer font-bold"
                title="Open NDMA Ground Rescue Coordination"
              >
                <LifeBuoy className="w-3 h-3 text-[#10B981] animate-pulse" />
                <span>SURVIVORS: {rescueReports.length}</span>
              </button>

              <div className="w-px h-3.5 bg-[#2B3743]" />

              <div className="flex items-center space-x-1">
                <Flame className="w-3 h-3 text-[#EF4444]" />
                <span className="text-[#707C88]">HAZARDS:</span>
                <span className="font-bold text-[#EF4444]">3</span>
              </div>

              <div className="w-px h-3.5 bg-[#2B3743]" />

              <div className="flex items-center space-x-1">
                <Battery className="w-3 h-3 text-[#10B981]" />
                <span className="text-[#707C88]">BAT:</span>
                <span className="font-bold text-[#10B981]">{lowestBattery.toFixed(0)}%</span>
              </div>

              <div className="w-px h-3.5 bg-[#2B3743]" />

              <div className="flex items-center space-x-1">
                <Radio className="w-3 h-3 text-[#5B8FB9]" />
                <span className="text-[#707C88]">COMMS:</span>
                <span className="font-bold text-[#5B8FB9]">98.4%</span>
              </div>
            </>
          ) : (
            /* 🧪 Engineering: ORCA → Covariance → SNR → Setpoint Freq → HAL → Solver */
            <>
              <div className="flex items-center space-x-1">
                <span className="text-[#707C88]">ORCA:</span>
                <span className="font-bold text-[#10B981]">0.82ms</span>
              </div>

              <div className="w-px h-3.5 bg-[#2B3743]" />

              <div className="flex items-center space-x-1">
                <span className="text-[#707C88]">COV(P):</span>
                <span className="font-bold text-[#5B8FB9]">0.012m²</span>
              </div>

              <div className="w-px h-3.5 bg-[#2B3743]" />

              <div className="flex items-center space-x-1">
                <span className="text-[#707C88]">SNR:</span>
                <span className="font-bold text-[#10B981]">28.4dB</span>
              </div>

              <div className="w-px h-3.5 bg-[#2B3743]" />

              <div className="flex items-center space-x-1">
                <span className="text-[#707C88]">FREQ:</span>
                <span className="font-bold text-[#5B8FB9]">50.0Hz</span>
              </div>

              <div className="w-px h-3.5 bg-[#2B3743]" />

              <div className="flex items-center space-x-1">
                <span className="text-[#707C88]">HAL:</span>
                <span className="font-extrabold text-[#EAB308]">{halPlatform}</span>
              </div>

              <div className="w-px h-3.5 bg-[#2B3743]" />

              <div className="flex items-center space-x-1">
                <span className="text-[#707C88]">SOLVER:</span>
                <span className="font-bold text-[#10B981]">VO-3D</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── 3. RIGHT ZONE: Primary Indicators, Labs Dropdown, RTL ── */}
      <div className="flex items-center space-x-2 flex-shrink-0">
        {/* Audit & Defensive Labs Unified Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setLabsDropdownOpen(!labsDropdownOpen)}
            className={`h-7.5 px-2.5 rounded-md border text-[10px] font-bold flex items-center space-x-1.5 transition cursor-pointer ${
              activeFailuresCount > 0
                ? 'bg-[#1C0F13] border-[#EF4444] text-[#EF4444] animate-pulse'
                : labsDropdownOpen
                ? 'bg-[#1B2530] border-[#5B8FB9] text-[#E7EBEF]'
                : 'bg-[#11171E] hover:bg-[#151D26] border-[#2B3743] hover:border-[#707C88] text-[#A9B3BD]'
            }`}
            title="Access Specialized Diagnostics & Verification Labs"
          >
            <Cpu className="w-3 h-3 text-[#5B8FB9]" />
            <span>AUDIT LABS</span>
            {activeFailuresCount > 0 && (
              <span className="px-1 py-0.2 rounded-full bg-[#EF4444] text-white text-[8px] font-black leading-none">
                {activeFailuresCount}
              </span>
            )}
            <ChevronDown className={`w-3 h-3 text-[#707C88] transition-transform ${labsDropdownOpen ? 'rotate-180 text-[#5B8FB9]' : ''}`} />
          </button>

          {labsDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#0B0F14] border border-[#2B3743] rounded-xl shadow-2xl z-50 p-1.5 space-y-1 font-mono text-xs animate-in fade-in-50 duration-150">
              <div className="px-2.5 py-1 text-[9px] text-[#707C88] font-extrabold uppercase border-b border-[#2B3743] tracking-wider">
                Defensive Architecture Labs
              </div>

              {/* Safety Gate */}
              <button
                onClick={() => {
                  setSafetyGateOpen(true);
                  setLabsDropdownOpen(false);
                }}
                className="w-full flex items-center space-x-2.5 p-2 rounded-lg hover:bg-[#151D26] text-left transition group"
              >
                <div className="w-6 h-6 rounded bg-[#10B981]/15 border border-[#10B981]/40 flex items-center justify-center text-[#10B981] flex-shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[#E7EBEF] text-[11px] group-hover:text-[#10B981] transition">Safety Gate</div>
                  <div className="text-[9px] text-[#707C88]">7 Pre-flight go/no-go checks</div>
                </div>
              </button>

              {/* Failure Lab */}
              <button
                onClick={() => {
                  setFailureLabOpen(true);
                  setLabsDropdownOpen(false);
                }}
                className="w-full flex items-center space-x-2.5 p-2 rounded-lg hover:bg-[#1C0F13] text-left transition group"
              >
                <div className="w-6 h-6 rounded bg-[#EF4444]/15 border border-[#EF4444]/40 flex items-center justify-center text-[#EF4444] flex-shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[#E7EBEF] text-[11px] group-hover:text-[#EF4444] transition">Failure Lab</div>
                  <div className="text-[9px] text-[#707C88]">Chaos fault &amp; GPS-denied tests</div>
                </div>
              </button>

              {/* Mission Replay */}
              <button
                onClick={() => {
                  setReplayOpen(true);
                  setLabsDropdownOpen(false);
                }}
                className="w-full flex items-center space-x-2.5 p-2 rounded-lg hover:bg-[#151D26] text-left transition group"
              >
                <div className="w-6 h-6 rounded bg-[#5B8FB9]/15 border border-[#5B8FB9]/40 flex items-center justify-center text-[#5B8FB9] flex-shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[#E7EBEF] text-[11px] group-hover:text-[#5B8FB9] transition">Mission Replay</div>
                  <div className="text-[9px] text-[#707C88]">4D blackbox trajectory scrub</div>
                </div>
              </button>

              {/* 1. Multi-station Logistics */}
              <button
                onClick={() => {
                  setChargingLogisticsOpen(true);
                  setLabsDropdownOpen(false);
                }}
                className="w-full flex items-center space-x-2.5 p-2 rounded-lg hover:bg-[#151D26] text-left transition group"
              >
                <div className="w-6 h-6 rounded bg-[#F59E0B]/15 border border-[#F59E0B]/40 flex items-center justify-center text-[#F59E0B] flex-shrink-0">
                  <BatteryCharging className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[#E7EBEF] text-[11px] group-hover:text-[#F59E0B] transition">
                    Charging Logistics
                  </div>
                  <div className="text-[9px] text-[#707C88]">Dynamic nearest-safe routing</div>
                </div>
              </button>

              {/* 2. Decision Provenance */}
              <button
                onClick={() => {
                  setProvenanceOpen(true);
                  setLabsDropdownOpen(false);
                }}
                className="w-full flex items-center space-x-2.5 p-2 rounded-lg hover:bg-[#151D26] text-left transition group"
              >
                <div className="w-6 h-6 rounded bg-[#8B5CF6]/15 border border-[#8B5CF6]/40 flex items-center justify-center text-[#8B5CF6] flex-shrink-0">
                  <Brain className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[#E7EBEF] text-[11px] group-hover:text-[#8B5CF6] transition">
                    Decision Provenance
                  </div>
                  <div className="text-[9px] text-[#707C88]">WHY vs. WHY NOT comparative audit</div>
                </div>
              </button>

              {/* 3. Hardware Abstraction (HAL) */}
              <button
                onClick={() => {
                  setHalOpen(true);
                  setLabsDropdownOpen(false);
                }}
                className="w-full flex items-center space-x-2.5 p-2 rounded-lg hover:bg-[#151D26] text-left transition group"
              >
                <div className="w-6 h-6 rounded bg-[#EAB308]/15 border border-[#EAB308]/40 flex items-center justify-center text-[#EAB308] flex-shrink-0">
                  <Cpu className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[#E7EBEF] text-[11px] group-hover:text-[#EAB308] transition">
                    Hardware Abstraction
                  </div>
                  <div className="text-[9px] text-[#707C88]">PX4 ⇄ Simulator driver swap</div>
                </div>
              </button>

              {/* 4. Sensor Degradation */}
              <button
                onClick={() => {
                  setDegradationOpen(true);
                  setLabsDropdownOpen(false);
                }}
                className="w-full flex items-center space-x-2.5 p-2 rounded-lg hover:bg-[#151D26] text-left transition group"
              >
                <div className="w-6 h-6 rounded bg-[#3B82F6]/15 border border-[#3B82F6]/40 flex items-center justify-center text-[#3B82F6] flex-shrink-0">
                  <Sliders className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[#E7EBEF] text-[11px] group-hover:text-[#3B82F6] transition">
                    Sensor Degradation
                  </div>
                  <div className="text-[9px] text-[#707C88]">Rain, drift &amp; RF loss uncertainty</div>
                </div>
              </button>

              {/* 5. Reality Boundary */}
              <button
                onClick={() => {
                  setArchitectureBoundaryOpen(true);
                  setLabsDropdownOpen(false);
                }}
                className="w-full flex items-center space-x-2.5 p-2 rounded-lg hover:bg-[#151D26] text-left transition group"
              >
                <div className="w-6 h-6 rounded bg-[#10B981]/15 border border-[#10B981]/40 flex items-center justify-center text-[#10B981] flex-shrink-0">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[#E7EBEF] text-[11px] group-hover:text-[#10B981] transition">
                    Reality Boundary
                  </div>
                  <div className="text-[9px] text-[#707C88]">Real core vs. simulated physics</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Vertical Divider */}
        <div className="h-4 w-px bg-[#2B3743]" />

        {/* Connection status */}
        <ConnectionStatus />

        {/* Emergency RTL Button */}
        <button
          onClick={() => setEmergencyModalOpen(true, 'ALL')}
          className="h-7.5 px-3 rounded-md bg-[#C75A5A] hover:bg-[#b04f4f] text-white font-extrabold text-xs tracking-wider flex items-center space-x-1.5 transition shadow-[0_0_12px_rgba(199,90,90,0.3)] active:scale-95 flex-shrink-0 cursor-pointer"
          title="Initiate Immediate Return-to-Launch for Swarm"
        >
          <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
          <span className="hidden sm:inline">EMERGENCY RTL</span>
        </button>
      </div>

      {/* Audit Log Modal */}
      <AuditViewModal isOpen={showAuditModal} onClose={() => setShowAuditModal(false)} />
    </header>
  );
});
