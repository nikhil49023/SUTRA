import React, { useState } from 'react';
import { useMissionStore } from '../stores/missionStore';
import { commandManager } from '../communication/CommandManager';
import { ProtectedAction } from '../security/ProtectedAction';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  Undo2,
  Redo2,
  Crosshair,
} from 'lucide-react';

export const MissionToolbar: React.FC = () => {
  const { state, waypoints, is_valid, validation_errors, triggerFitRoute } = useMissionStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStart = () => {
    setIsProcessing(true);
    commandManager.sendCommand('mission.start', {}, {
      onAck: () => setIsProcessing(false),
      onRollback: () => setIsProcessing(false),
    });
  };

  const handlePause = () => {
    commandManager.sendCommand('mission.pause', {});
  };

  const handleResume = () => {
    commandManager.sendCommand('mission.resume', {});
  };

  const handleClear = () => {
    if (confirm('Clear all mission waypoints?')) {
      commandManager.sendCommand('mission.clear', {});
    }
  };

  const handleValidate = () => {
    commandManager.sendCommand('mission.validate', {});
  };

  const handleUndo = () => {
    commandManager.sendCommand('MISSION_UNDO', {});
  };

  const handleRedo = () => {
    commandManager.sendCommand('MISSION_REDO', {});
  };

  const isRunning = state === 'IN_PROGRESS' || state === 'MISSION';
  const isPaused = state === 'PAUSED' || state === 'HOLD';

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0f141c]/90 border border-slate-800 rounded-lg p-2 font-mono text-xs select-none">
      {/* Left controls */}
      <div className="flex items-center space-x-1.5">
        <ProtectedAction permission="mission.execute" disabledTooltip="Flight Pilot or Commander role required to start mission">
          {!isRunning && !isPaused ? (
            <button
              onClick={handleStart}
              disabled={waypoints.length === 0 || isProcessing}
              className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold flex items-center space-x-1 shadow-[0_0_12px_rgba(16,185,129,0.3)] transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>START MISSION</span>
            </button>
          ) : isRunning ? (
            <button
              onClick={handlePause}
              className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center space-x-1 transition"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>HOLD / PAUSE</span>
            </button>
          ) : (
            <button
              onClick={handleResume}
              className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center space-x-1 transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>RESUME</span>
            </button>
          )}
        </ProtectedAction>

        <ProtectedAction permission="mission.validate">
          <button
            onClick={handleValidate}
            className={`px-2.5 py-1.5 rounded border text-[11px] font-bold flex items-center space-x-1 transition ${
              is_valid
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
            }`}
            title={is_valid ? 'Mission is Valid' : validation_errors?.join(', ') || ''}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{is_valid ? 'VALIDATED' : 'VALIDATE'}</span>
          </button>
        </ProtectedAction>

        <button
          onClick={triggerFitRoute}
          className="p-1.5 rounded border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 transition"
          title="Fit Route to Screen"
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right controls */}
      <div className="flex items-center space-x-1">
        <button
          onClick={handleUndo}
          className="p-1.5 rounded border border-slate-800 bg-slate-900/40 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleRedo}
          className="p-1.5 rounded border border-slate-800 bg-slate-900/40 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>
        <ProtectedAction permission="mission.edit">
          <button
            onClick={handleClear}
            disabled={waypoints.length === 0}
            className="p-1.5 rounded border border-rose-900/40 bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 disabled:opacity-30 transition"
            title="Clear All Waypoints"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </ProtectedAction>
      </div>
    </div>
  );
};
