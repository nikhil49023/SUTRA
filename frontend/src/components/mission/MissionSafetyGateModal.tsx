import React, { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useMissionStore } from '../../stores/missionStore';
import { useFleetStore } from '../../stores/fleetStore';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  CloudSun,
  Battery,
  MapPin,
  Shield,
  Radio,
  Cpu,
  Route,
  X,
  Play,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';

export const MissionSafetyGateModal: React.FC = () => {
  const safetyGateOpen = useAppStore((s) => (s as any).safetyGateOpen);
  const setSafetyGateOpen = useAppStore((s) => (s as any).setSafetyGateOpen);
  const drones = useFleetStore((s) => s.drones);

  // Failure simulation state for defensible demonstration
  const [simulateBlockage, setSimulateBlockage] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executedSuccess, setExecutedSuccess] = useState<boolean>(false);

  if (!safetyGateOpen) return null;

  const gates = [
    {
      id: 'weather',
      title: 'Weather Envelope',
      icon: CloudSun,
      spec: 'Wind < 12.0 m/s, Visibility > 5.0 km, Zero Lightning',
      measured: 'Wind 4.2 m/s, Visibility 10.0 km',
      passed: true,
    },
    {
      id: 'battery',
      title: 'Energy & RTL Reserve',
      icon: Battery,
      spec: 'All UAVs ≥ 80% launch; ≥ 25% RTL reserve at all waypoints',
      measured: simulateBlockage
        ? 'UAV-03 RTL reserve = 18.4% (< 25% safety threshold)'
        : 'All 4 UAVs battery ≥ 84%; RTL reserve ≥ 28.2%',
      passed: !simulateBlockage,
      blockedReason: 'UAV-03 cannot guarantee 25% RTL energy reserve under current wind vector.',
    },
    {
      id: 'lz',
      title: 'Landing Zone (LZ) Clearance',
      icon: MapPin,
      spec: 'Primary & Secondary LZ slopes < 8.0°, zero OctoMap obstacles',
      measured: 'LZ-01 & LZ-02 verified flat (slope 1.2°)',
      passed: true,
    },
    {
      id: 'airspace',
      title: 'Airspace & Geofence Containment',
      icon: Shield,
      spec: 'Containment within 500m radius; altitude ceiling < 120m AGL',
      measured: 'Max distance 340m, flight altitude 25m AGL',
      passed: true,
    },
    {
      id: 'comms',
      title: 'Mesh Link & Consensus',
      icon: Radio,
      spec: '802.11s PDR ≥ 95%, RF SNR > 20 dB, SwarmRAFT leader online',
      measured: 'Mesh PDR 98.4%, SNR 28.4 dB, Leader election verified',
      passed: true,
    },
    {
      id: 'health',
      title: 'Avionics & Motor Balance',
      icon: Cpu,
      spec: 'ESC motor RPM delta < 120 RPM, IMU gyro variance < 0.02',
      measured: 'RPM delta 45 RPM, IMU bias nominal',
      passed: true,
    },
    {
      id: 'escape',
      title: 'Ballistic Escape Corridor',
      icon: Route,
      spec: 'Secondary emergency retreat path clear of terrain voxels',
      measured: 'Escape corridor Delta-4 clear (clearance 4.2m)',
      passed: true,
    },
  ];

  const allPassed = gates.every((g) => g.passed);

  const handleExecute = () => {
    setIsExecuting(true);
    useMissionStore.getState().startMission();
    setTimeout(() => {
      setIsExecuting(false);
      setExecutedSuccess(true);
      setTimeout(() => {
        setExecutedSuccess(false);
        setSafetyGateOpen(false);
      }, 1500);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none font-mono">
      <div className="w-full max-w-3xl bg-[#0B0F14] border border-[#2B3743] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#11171E] border-b border-[#2B3743] px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className={`w-7 h-7 rounded border flex items-center justify-center ${
              allPassed
                ? 'bg-[#10B981]/20 border-[#10B981]/60 text-[#10B981]'
                : 'bg-[#EF4444]/20 border-[#EF4444]/60 text-[#EF4444]'
            }`}>
              {allPassed ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm text-[#E7EBEF] tracking-wide">
                  MISSION READINESS SAFETY GATE (PRE-EXECUTION AUDIT)
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  allPassed
                    ? 'bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981]'
                    : 'bg-[#EF4444]/20 border border-[#EF4444]/40 text-[#EF4444] animate-pulse'
                }`}>
                  {allPassed ? 'GREEN — MISSION READY' : 'RED — MISSION BLOCKED'}
                </span>
              </div>
              <span className="text-[10px] text-[#707C88]">
                Mandatory interlock gate required prior to autonomous multi-UAV swarm execution
              </span>
            </div>
          </div>
          <button
            onClick={() => setSafetyGateOpen(false)}
            className="p-1 rounded text-[#707C88] hover:text-[#E7EBEF] hover:bg-[#151D26] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar">
          {/* Demo Control: Force Failure / Clear Failure */}
          <div className="bg-[#11171E] p-3 rounded-lg border border-[#2B3743] flex items-center justify-between">
            <span className="text-xs text-[#A9B3BD] font-bold">SAFETY GATE TEST DEMO:</span>
            <button
              onClick={() => setSimulateBlockage(!simulateBlockage)}
              className={`px-3 py-1 rounded text-xs font-bold transition flex items-center space-x-1.5 ${
                simulateBlockage
                  ? 'bg-[#10B981] text-white'
                  : 'bg-[#151D26] text-[#EF4444] border border-[#EF4444]/50 hover:bg-[#1C0F13]'
              }`}
            >
              {simulateBlockage ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>RESOLVE: RE-CALCULATE RESERVE (RESTORE 28.2%)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>SIMULATE LOW RTL RESERVE (UAV-03 @ 18.4%)</span>
                </>
              )}
            </button>
          </div>

          {/* 7 Safety Gates Checklist */}
          <div className="space-y-2">
            {gates.map((gate, index) => {
              return (
                <div
                  key={gate.id}
                  className={`p-3 rounded-lg border flex items-center justify-between transition ${
                    gate.passed
                      ? 'bg-[#151D26] border-[#2B3743]'
                      : 'bg-[#1C0F13] border-[#EF4444] shadow-[0_0_12px_rgba(239,68,68,0.25)]'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${
                      gate.passed ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-[#EF4444]/20 text-[#EF4444]'
                    }`}>
                      {gate.passed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </div>

                    <div className="truncate">
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-xs text-[#E7EBEF]">
                          {index + 1}. {gate.title}
                        </span>
                        <span className="text-[10px] text-[#707C88] hidden sm:inline">// {gate.spec}</span>
                      </div>
                      <div className={`text-[11px] mt-0.5 ${gate.passed ? 'text-[#10B981]' : 'text-[#EF4444] font-bold'}`}>
                        {gate.measured}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ml-2 flex-shrink-0 ${
                    gate.passed
                      ? 'bg-[#10B981]/15 border-[#10B981]/30 text-[#10B981]'
                      : 'bg-[#EF4444]/20 border-[#EF4444] text-[#EF4444] animate-pulse'
                  }`}>
                    {gate.passed ? 'PASSED' : 'BLOCKED'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Action Trigger */}
          <div className="pt-2">
            {allPassed ? (
              <button
                onClick={handleExecute}
                disabled={isExecuting || executedSuccess}
                className="w-full py-3 rounded-lg bg-[#10B981] hover:bg-[#0ea371] text-white font-extrabold text-xs tracking-wider flex items-center justify-center space-x-2 shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-[0.98] transition cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>
                  {executedSuccess
                    ? '✓ SWARM MISSION EXECUTING (50 Hz OFFBOARD ACTIVE)'
                    : '🟢 SAFETY GATE VERIFIED — EXECUTE SWARM MISSION'}
                </span>
              </button>
            ) : (
              <div className="p-3.5 rounded-lg bg-[#1C0F13] border border-[#EF4444] flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 text-[#EF4444]">
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="font-bold">
                    MISSION BLOCKED: UAV-03 cannot guarantee RTL energy reserve.
                  </span>
                </div>
                <button
                  onClick={() => setSimulateBlockage(false)}
                  className="px-3 py-1 rounded bg-[#11171E] border border-[#EF4444] text-[#E7EBEF] font-bold text-[10px] hover:bg-[#1B2530]"
                >
                  AUTO-REPLAN
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
