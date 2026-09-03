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
      <div className="w-full max-w-md bg-[#11171E] border-2 border-[#C75A5A] rounded-xl p-5 shadow-[0_0_24px_rgba(199,90,90,0.25)] font-mono space-y-4">
        <div className="flex items-center justify-between border-b border-[#2B3743] pb-3">
          <div className="flex items-center space-x-2 text-[#C75A5A] font-bold">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
            <span className="text-base tracking-wider uppercase">EMERGENCY RETURN-TO-LAUNCH</span>
          </div>
          <button
            onClick={() => setEmergencyModalOpen(false)}
            className="p-1 text-[#707C88] hover:text-[#E7EBEF]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-[#E7EBEF] space-y-2">
          <p className="text-[#C75A5A]">
            ⚠️ You are about to trigger an immediate, high-priority Return-To-Launch override for{' '}
            <strong className="text-white underline">{emergencyTargetDrone}</strong>.
          </p>
          <p className="text-[#A9B3BD]">
            All active waypoint trajectories and mission legs will be halted immediately.
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-[#707C88]">Type "RTL" to confirm command authorization:</label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            placeholder="TYPE RTL"
            className="w-full bg-[#0B0F14] border border-[#C75A5A]/60 rounded px-3 py-1.5 text-center font-bold text-[#E7EBEF] text-sm tracking-widest focus:ring-1 focus:ring-[#C75A5A]"
            autoFocus
          />
        </div>

        <div className="flex items-center space-x-3 pt-2">
          <button
            onClick={() => setEmergencyModalOpen(false)}
            className="flex-1 py-2 rounded bg-[#151D26] border border-[#2B3743] hover:bg-[#1B2530] text-[#A9B3BD] hover:text-[#E7EBEF] text-xs font-bold transition"
          >
            CANCEL
          </button>
          <button
            onClick={handleExecuteRtl}
            disabled={confirmText !== 'RTL'}
            className="flex-1 py-2 rounded bg-[#C75A5A] border border-[#C75A5A] hover:bg-[#b04f4f] disabled:opacity-30 text-white text-xs font-bold transition shadow-[0_0_12px_rgba(199,90,90,0.3)]"
          >
            EXECUTE RTL NOW
          </button>
        </div>
      </div>
    </div>
  );
};
