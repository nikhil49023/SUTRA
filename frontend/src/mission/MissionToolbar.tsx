import React, { useState, memo } from 'react';
import { useMissionStore } from '../stores/missionStore';
import { commandManager } from '../communication/CommandManager';
import { ProtectedAction } from '../security/ProtectedAction';
import {
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  Undo2,
  Redo2,
  Crosshair,
} from 'lucide-react';

export const MissionToolbar: React.FC = memo(() => {
  const state = useMissionStore((s) => s.state);
  const waypoints = useMissionStore((s) => s.waypoints);
  const isValid = useMissionStore((s) => s.is_valid);
  const validationErrors = useMissionStore((s) => s.validation_errors);
  const triggerFitRoute = useMissionStore((s) => s.triggerFitRoute);

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
    <div className="flex flex-wrap items-center justify-between gap-2 bg-[#11171E] border border-[#2B3743] rounded-lg p-2 font-mono text-xs select-none">
      {/* Left controls */}
      <div className="flex items-center space-x-1.5">
        <ProtectedAction permission="mission.execute" disabledTooltip="Flight Pilot or Commander role required to start mission">
          {!isRunning && !isPaused ? (
            <button
              onClick={handleStart}
              disabled={waypoints.length === 0 || isProcessing}
              className="px-3 py-1.5 rounded bg-[#4F9A72] hover:bg-[#438361] disabled:opacity-40 text-white font-bold flex items-center space-x-1 transition active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>START MISSION</span>
            </button>
          ) : isRunning ? (
            <button
              onClick={handlePause}
              className="px-3 py-1.5 rounded bg-[#C49A4A] hover:bg-[#ad8841] text-white font-bold flex items-center space-x-1 transition active:scale-95"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>HOLD / PAUSE</span>
            </button>
          ) : (
            <button
              onClick={handleResume}
              className="px-3 py-1.5 rounded bg-[#5B8FB9] hover:bg-[#4d7ca2] text-white font-bold flex items-center space-x-1 transition active:scale-95"
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
              isValid
                ? 'bg-[#151D26] border-[#4F9A72]/50 text-[#4F9A72]'
                : 'bg-[#151D26] border-[#C75A5A]/50 text-[#C75A5A]'
            }`}
            title={isValid ? 'Mission is Valid' : validationErrors?.join(', ') || ''}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isValid ? 'VALIDATED' : 'VALIDATE'}</span>
          </button>
        </ProtectedAction>

        <button
          onClick={triggerFitRoute}
          className="p-1.5 rounded border border-[#2B3743] bg-[#151D26] hover:bg-[#1B2530] text-[#A9B3BD] hover:text-[#5B8FB9] transition"
          title="Fit Route to Screen"
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right controls */}
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
            onClick={handleClear}
            disabled={waypoints.length === 0}
            className="p-1.5 rounded border border-[#C75A5A]/40 bg-[#151D26] hover:bg-[#1B2530] text-[#C75A5A] disabled:opacity-30 transition"
            title="Clear All Waypoints"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </ProtectedAction>
      </div>
    </div>
  );
});
