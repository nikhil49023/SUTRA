import React, { memo } from 'react';
import { useFleetStore } from '../../stores/fleetStore';
import { useMissionStore } from '../../stores/missionStore';
import { useAIStore } from '../../stores/aiStore';
import { useAppStore } from '../../stores/appStore';
import { commandManager } from '../../communication/CommandManager';
import {
  Play,
  Pause,
  Home,
  Compass,
  Terminal,
  Target,
  Video,
} from 'lucide-react';

import { FormationType } from '../../types/fleet';

export const SwarmQuickDock: React.FC = memo(() => {
  const formation = useFleetStore((s) => s.formation);
  const updateFormation = useFleetStore((s) => s.updateFormation);
  const drones = useFleetStore((s) => s.drones);
  const missionState = useMissionStore((s) => s.state);
  const startMission = useMissionStore((s) => s.startMission);
  const pauseMission = useMissionStore((s) => s.pauseMission);
  const abortMission = useMissionStore((s) => s.abortMission);
  const trackedTargets = useAIStore((s) => s.tracked_targets);
  const toggleConsole = useAppStore((s) => s.toggleConsole);
  const isConsoleOpen = useAppStore((s) => s.isConsoleOpen);
  const isHudOpen = useAppStore((s) => s.isHudOpen);
  const toggleHud = useAppStore((s) => s.toggleHud);
  const activeSection = useAppStore((s) => s.activeSection);
  const setActiveSection = useAppStore((s) => s.setActiveSection);

  const droneCount = Object.keys(drones).length;
  const latestTarget = trackedTargets && trackedTargets.length > 0 ? trackedTargets[0] : null;

  const handleFormationSelect = (f: FormationType) => {
    updateFormation(f);
    commandManager.sendCommand('fleet.formation', { formation: f });
  };

  const handleQuickCommand = (cmd: string, params: Record<string, any> = {}) => {
    commandManager.sendCommand(cmd, params);
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto select-none flex flex-col items-center space-y-2">
      {/* Live AI / Telemetry Ticker Badge */}
      {latestTarget ? (
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-[#11171E]/95 backdrop-blur-md border border-[#10B981]/50 shadow-[0_0_15px_rgba(16,185,129,0.25)] text-xs font-mono text-[#E7EBEF] animate-in fade-in slide-in-from-bottom-2">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
          <Target className="w-3.5 h-3.5 text-[#10B981]" />
          <span className="font-bold text-[#10B981]">AI DETECTION:</span>
          <span>{latestTarget.label} ({(latestTarget.confidence * 100).toFixed(0)}%)</span>
          <span className="text-[#707C88] hidden sm:inline">[{latestTarget.latitude.toFixed(4)}, {latestTarget.longitude.toFixed(4)}]</span>
        </div>
      ) : (
        <div className="flex items-center space-x-2 px-3 py-0.5 rounded-full bg-[#11171E]/90 backdrop-blur-md border border-white/10 text-[11px] font-mono text-[#A9B3BD] shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          <span>Swarm nominal • {droneCount} UAVs linked</span>
          <span className="text-[#707C88]">• Active: {formation}</span>
        </div>
      )}

      {/* Main Dock Capsule */}
      <div className="flex items-center space-x-1.5 sm:space-x-2 bg-[#0B0F14]/92 backdrop-blur-2xl border border-white/10 p-1.5 rounded-2xl shadow-[0_12px_35px_rgba(0,0,0,0.75)]">
        {/* Mission Run / Pause Button */}
        {missionState === 'MISSION' || missionState === 'IN_PROGRESS' ? (
          <button
            onClick={pauseMission}
            className="px-3 py-1.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-mono font-black text-xs flex items-center space-x-1.5 shadow-[0_0_12px_rgba(245,158,11,0.4)] transition hover:scale-105 active:scale-95 cursor-pointer"
            title="Pause / Hold Swarm Flight (Hold in place)"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>HOLD SWARM</span>
          </button>
        ) : (
          <button
            onClick={startMission}
            className="px-3 py-1.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-mono font-black text-xs flex items-center space-x-1.5 shadow-[0_0_12px_rgba(16,185,129,0.4)] transition hover:scale-105 active:scale-95 cursor-pointer"
            title="Dispatch Autonomous Swarm Mission"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>START MISSION</span>
          </button>
        )}

        <div className="h-6 w-px bg-white/10" />

        {/* Formation Selectors */}
        <div className="flex items-center space-x-1 bg-[#11171E]/80 p-0.5 rounded-xl border border-white/5">
          <button
            onClick={() => handleFormationSelect('DIAMOND')}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
              formation === 'DIAMOND'
                ? 'bg-[#5B8FB9] text-white shadow-sm'
                : 'text-[#707C88] hover:text-[#E7EBEF] hover:bg-white/5'
            }`}
            title="Switch Swarm to Diamond Formation"
          >
            DIAMOND
          </button>
          <button
            onClick={() => handleFormationSelect('V_FORMATION')}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
              formation === 'V_FORMATION' || formation === 'V-FORMATION'
                ? 'bg-[#5B8FB9] text-white shadow-sm'
                : 'text-[#707C88] hover:text-[#E7EBEF] hover:bg-white/5'
            }`}
            title="Switch Swarm to V-Formation"
          >
            V-SHAPE
          </button>
          <button
            onClick={() => handleFormationSelect('LINE')}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
              formation === 'LINE'
                ? 'bg-[#5B8FB9] text-white shadow-sm'
                : 'text-[#707C88] hover:text-[#E7EBEF] hover:bg-white/5'
            }`}
            title="Switch Swarm to Echelon Line"
          >
            LINE
          </button>
        </div>

        <div className="h-6 w-px bg-white/10" />

        {/* Quick Drone Actions */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => handleQuickCommand('drone.takeoff_all', { altitude: 20 })}
            className="px-2.5 py-1.5 rounded-xl bg-[#151D26] hover:bg-[#1B2530] border border-white/10 hover:border-[#5B8FB9] text-[#A9B3BD] hover:text-[#E7EBEF] text-[11px] font-mono font-bold transition cursor-pointer"
            title="Command Swarm Takeoff to 20m AGL"
          >
            TAKEOFF
          </button>
          <button
            onClick={() => handleQuickCommand('drone.land_all', {})}
            className="px-2.5 py-1.5 rounded-xl bg-[#151D26] hover:bg-[#1B2530] border border-white/10 hover:border-[#F59E0B] text-[#A9B3BD] hover:text-[#E7EBEF] text-[11px] font-mono font-bold transition cursor-pointer"
            title="Command Swarm Gentle Land"
          >
            LAND
          </button>
          <button
            onClick={abortMission}
            className="px-2.5 py-1.5 rounded-xl bg-[#1C0F13] hover:bg-[#EF4444]/20 border border-[#EF4444]/40 hover:border-[#EF4444] text-[#EF4444] text-[11px] font-mono font-bold transition flex items-center space-x-1 cursor-pointer"
            title="Emergency Swarm Return-to-Launch"
          >
            <Home className="w-3 h-3" />
            <span>RTL</span>
          </button>
        </div>

        <div className="h-6 w-px bg-white/10" />

        {/* HUD, Camera & Terminal Toggles */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveSection(activeSection === 'CAMERA' ? 'COMMAND' : 'CAMERA')}
            className={`p-1.5 rounded-xl border transition cursor-pointer ${
              activeSection === 'CAMERA'
                ? 'bg-[#5B8FB9]/20 border-[#5B8FB9] text-[#5B8FB9]'
                : 'bg-[#151D26] border-white/10 text-[#707C88] hover:text-[#E7EBEF]'
            }`}
            title="Toggle Remote Live Camera Receiver (C)"
          >
            <Video className="w-4 h-4" />
          </button>
          <button
            onClick={toggleHud}
            className={`p-1.5 rounded-xl border transition cursor-pointer ${
              isHudOpen
                ? 'bg-[#5B8FB9]/20 border-[#5B8FB9] text-[#5B8FB9]'
                : 'bg-[#151D26] border-white/10 text-[#707C88] hover:text-[#E7EBEF]'
            }`}
            title="Toggle Primary Flight Display HUD (H)"
          >
            <Compass className="w-4 h-4" />
          </button>
          <button
            onClick={toggleConsole}
            className={`p-1.5 rounded-xl border transition cursor-pointer ${
              isConsoleOpen
                ? 'bg-[#5B8FB9]/20 border-[#5B8FB9] text-[#5B8FB9]'
                : 'bg-[#151D26] border-white/10 text-[#707C88] hover:text-[#E7EBEF]'
            }`}
            title="Toggle System Log Console Drawer (L)"
          >
            <Terminal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
});
