import React, { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { wsClient } from '../../communication/WebSocketClient';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';

export const EmergencyModal: React.FC = () => {
  const { emergencyModalOpen, emergencyTargetDrone, setEmergencyModalOpen } = useAppStore();
  const [confirmText, setConfirmText] = useState('');

  if (!emergencyModalOpen) return null;

  const handleExecuteRtl = () => {
    wsClient.sendCommand('EMERGENCY_RTL', { drone_id: emergencyTargetDrone });
    setEmergencyModalOpen(false);
    setConfirmText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm select-none">
      <div className="w-full max-w-md bg-[#0f141c] border-2 border-rose-600 rounded-xl p-5 shadow-[0_0_40px_rgba(239,68,68,0.4)] font-mono space-y-4">
        <div className="flex items-center justify-between border-b border-rose-900/60 pb-3">
          <div className="flex items-center space-x-2 text-rose-400 font-bold">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
            <span className="text-base tracking-wider uppercase">EMERGENCY RETURN-TO-LAUNCH</span>
          </div>
          <button
            onClick={() => setEmergencyModalOpen(false)}
            className="p-1 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-slate-300 space-y-2">
          <p className="text-rose-200">
            ⚠️ You are about to trigger an immediate, high-priority Return-To-Launch override for{' '}
            <strong className="text-white underline">{emergencyTargetDrone}</strong>.
          </p>
          <p className="text-slate-400">
            All active waypoint trajectories and mission legs will be halted immediately.
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-slate-400">Type "RTL" to confirm command authorization:</label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            placeholder="TYPE RTL"
            className="w-full bg-slate-950 border border-rose-500/60 rounded px-3 py-1.5 text-center font-bold text-rose-300 text-sm tracking-widest focus:ring-2 focus:ring-rose-500"
            autoFocus
          />
        </div>

        <div className="flex items-center space-x-3 pt-2">
          <button
            onClick={() => setEmergencyModalOpen(false)}
            className="flex-1 py-2 rounded bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition"
          >
            CANCEL
          </button>
          <button
            onClick={handleExecuteRtl}
            disabled={confirmText !== 'RTL'}
            className="flex-1 py-2 rounded bg-rose-600 border border-rose-400 hover:bg-rose-500 disabled:opacity-30 text-white text-xs font-bold transition shadow-[0_0_15px_rgba(239,68,68,0.5)]"
          >
            EXECUTE RTL NOW
          </button>
        </div>
      </div>
    </div>
  );
};
