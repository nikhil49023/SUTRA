/**
 * Smart Horizon GCS — Tactical Mission Action Toolbar & 1-Click Presets
 */

import React, { useState, memo } from 'react';
import { useMissionStore, MISSION_PRESETS } from '../stores/missionStore';
import { useAppStore } from '../stores/appStore';
import { useFleetStore } from '../stores/fleetStore';
import { commandManager } from '../communication/CommandManager';
import { ProtectedAction } from '../security/ProtectedAction';
import {
  Play,
  Pause,
  RotateCcw,
  ShieldAlert,
  Trash2,
  CheckCircle2,
  Undo2,
  Redo2,
  Crosshair,
  Sparkles,
  ChevronDown,
  Plus,
  Route,
} from 'lucide-react';

export const MissionToolbar: React.FC = memo(() => {
  const state = useMissionStore((s) => s.state);
  const waypoints = useMissionStore((s) => s.waypoints);
  const isValid = useMissionStore((s) => s.is_valid);
  const validationErrors = useMissionStore((s) => s.validation_errors);
  const triggerFitRoute = useMissionStore((s) => s.triggerFitRoute);
  const startMission = useMissionStore((s) => s.startMission);
  const pauseMission = useMissionStore((s) => s.pauseMission);
  const resumeMission = useMissionStore((s) => s.resumeMission);
  const restartMission = useMissionStore((s) => s.restartMission);
  const abortMission = useMissionStore((s) => s.abortMission);
  const clearMission = useMissionStore((s) => s.clearMission);
  const loadPreset = useMissionStore((s) => s.loadPreset);
  const addWaypoint = useMissionStore((s) => s.addWaypoint);
  const isAddingWaypoint = useMissionStore((s) => s.isAddingWaypoint);
  const setIsAddingWaypoint = useMissionStore((s) => s.setIsAddingWaypoint);

  const drones = useFleetStore((s) => s.drones);
  const droneList = Object.values(drones);
  const centerLat = droneList.length > 0 ? droneList[0].latitude : 37.7749;
  const centerLon = droneList.length > 0 ? droneList[0].longitude : -122.4194;

  const [presetMenuOpen, setPresetMenuOpen] = useState(false);

  const isRunning = state === 'MISSION' || state === 'IN_PROGRESS';
  const isPaused = state === 'HOLD' || state === 'PAUSED';
  const isRtl = state === 'RTL';
  const isCompleted = state === 'COMPLETED';

  const handleValidate = () => {
    commandManager.sendCommand('mission.validate', {});
  };

  const handleUndo = () => {
    commandManager.sendCommand('MISSION_UNDO', {});
  };

  const handleRedo = () => {
    commandManager.sendCommand('MISSION_REDO', {});
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-[#11171E] border border-[#2B3743] rounded-lg p-2.5 font-mono text-xs select-none shadow-md">
      {/* 1. Left controls: Primary Mission Execution Actions */}
      <div className="flex flex-wrap items-center gap-1.5">
        <ProtectedAction permission="mission.execute" disabledTooltip="Pilot / Commander role required">
          {!isRunning && !isPaused && !isRtl ? (
            <button
              onClick={() => {
                useAppStore.getState().setSafetyGateOpen(true);
              }}
              disabled={waypoints.length === 0}
              className="px-3.5 py-1.5 rounded bg-[#10B981] hover:bg-[#059669] disabled:opacity-40 text-white font-extrabold flex items-center space-x-1.5 shadow-[0_0_12px_rgba(16,185,129,0.4)] transition active:scale-95 cursor-pointer"
              title="Audit Pre-Execution Safety Gate before Swarm Launch"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>SAFETY GATE & START</span>
            </button>
          ) : isRunning ? (
            <div className="flex items-center space-x-1">
              <button
                onClick={pauseMission}
                className="px-3 py-1.5 rounded bg-[#F59E0B] hover:bg-[#D97706] text-white font-extrabold flex items-center space-x-1.5 shadow-[0_0_10px_rgba(245,158,11,0.4)] transition active:scale-95"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>HOLD / PAUSE</span>
              </button>

              <button
                onClick={abortMission}
                className="px-2.5 py-1.5 rounded bg-[#EF4444] hover:bg-[#DC2626] text-white font-extrabold flex items-center space-x-1 transition active:scale-95"
                title="Abort mission & Return to Launch"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>RTL</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-1">
              <button
                onClick={resumeMission}
                className="px-3 py-1.5 rounded bg-[#3B82F6] hover:bg-[#2563EB] text-white font-extrabold flex items-center space-x-1.5 shadow-[0_0_10px_rgba(59,130,246,0.4)] transition active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>RESUME</span>
              </button>

              <button
                onClick={restartMission}
                className="px-2.5 py-1.5 rounded bg-[#151D26] border border-[#2B3743] hover:border-[#5B8FB9] text-[#A9B3BD] hover:text-white font-bold flex items-center space-x-1 transition"
                title="Restart mission from WP 1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RESTART</span>
              </button>

              <button
                onClick={abortMission}
                className="px-2.5 py-1.5 rounded bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold flex items-center space-x-1 transition"
                title="Return to Launch"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>RTL</span>
              </button>
            </div>
          )}
        </ProtectedAction>

        {/* Add Waypoint Click Tool */}
        <button
          onClick={() => setIsAddingWaypoint(!isAddingWaypoint)}
          className={`px-2.5 py-1.5 rounded border text-[11px] font-bold flex items-center space-x-1 transition ${
            isAddingWaypoint
              ? 'bg-[#5B8FB9] text-[#0B0F14] border-white shadow-[0_0_10px_rgba(91,143,185,0.6)]'
              : 'bg-[#151D26] border-[#2B3743] text-[#A9B3BD] hover:text-[#E7EBEF] hover:border-[#5B8FB9]'
          }`}
          title="Click to enable waypoint placement on the map"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isAddingWaypoint ? 'CLICK MAP TO ADD' : '+ ADD WAYPOINT'}</span>
        </button>

        {/* 1-Click Presets Dropdown */}
        <div className="relative">
          <button
            onClick={() => setPresetMenuOpen(!presetMenuOpen)}
            className="px-2.5 py-1.5 rounded bg-[#151D26] border border-[#2B3743] hover:border-[#5B8FB9] text-[#E7EBEF] font-bold text-[11px] flex items-center space-x-1 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#5B8FB9]" />
            <span>PRESETS</span>
            <ChevronDown className="w-3 h-3 text-[#707C88]" />
          </button>

          {presetMenuOpen && (
            <div className="absolute left-0 top-full mt-1 w-64 bg-[#0B0F14] border border-[#2B3743] rounded-lg shadow-2xl z-50 p-1.5 space-y-1">
              <div className="px-2 py-1 text-[10px] text-[#707C88] font-bold uppercase border-b border-[#2B3743]">
                Tactical Flight Presets
              </div>
              {MISSION_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    loadPreset(preset.id, centerLat, centerLon);
                    setPresetMenuOpen(false);
                  }}
                  className="w-full text-left p-2 rounded hover:bg-[#151D26] text-[#E7EBEF] transition space-y-0.5"
                >
                  <div className="font-bold text-xs text-[#5B8FB9] flex items-center space-x-1">
                    <Route className="w-3 h-3" />
                    <span>{preset.name}</span>
                  </div>
                  <div className="text-[10px] text-[#707C88] line-clamp-2">
                    {preset.description}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Validation Status Button */}
        <ProtectedAction permission="mission.validate">
          <button
            onClick={handleValidate}
            className={`px-2.5 py-1.5 rounded border text-[11px] font-bold flex items-center space-x-1 transition ${
              isValid
                ? 'bg-[#151D26] border-[#10B981]/50 text-[#10B981]'
                : 'bg-[#151D26] border-[#EF4444]/50 text-[#EF4444]'
            }`}
            title={isValid ? 'Mission is Validated' : validationErrors?.join(', ') || 'Validation errors exist'}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isValid ? 'VALIDATED' : 'VALIDATE'}</span>
          </button>
        </ProtectedAction>

        {/* Fit Route */}
        <button
          onClick={triggerFitRoute}
          className="p-1.5 rounded border border-[#2B3743] bg-[#151D26] hover:bg-[#1B2530] text-[#A9B3BD] hover:text-[#5B8FB9] transition"
          title="Fit Route to Viewport"
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Right controls: Undo, Redo, Clear */}
      <div className="flex items-center space-x-1">
        <button
          onClick={handleUndo}
          className="p-1.5 rounded border border-[#2B3743] bg-[#151D26] hover:bg-[#1B2530] text-[#707C88] hover:text-[#E7EBEF] transition"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleRedo}
          className="p-1.5 rounded border border-[#2B3743] bg-[#151D26] hover:bg-[#1B2530] text-[#707C88] hover:text-[#E7EBEF] transition"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>
        <ProtectedAction permission="mission.edit">
          <button
            onClick={() => {
              if (confirm('Clear all mission waypoints?')) {
                clearMission();
              }
            }}
            disabled={waypoints.length === 0}
            className="p-1.5 rounded border border-[#EF4444]/40 bg-[#151D26] hover:bg-[#EF4444]/20 text-[#EF4444] disabled:opacity-30 transition"
            title="Clear All Waypoints"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </ProtectedAction>
      </div>
    </div>
  );
});
