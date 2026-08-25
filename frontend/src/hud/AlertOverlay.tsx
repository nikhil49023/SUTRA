import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface AlertOverlayProps {
  isCritical: boolean;
  message?: string;
}

export const AlertOverlay: React.FC<AlertOverlayProps> = ({ isCritical, message }) => {
  if (!isCritical || !message) return null;

  return (
    <div className="absolute inset-x-4 top-4 z-30 flex items-center justify-center pointer-events-none animate-bounce">
      <div className="flex items-center space-x-2 px-4 py-2 bg-[#151D26] border-2 border-[#C75A5A] rounded-lg text-[#C75A5A] font-mono font-bold shadow-[0_0_12px_rgba(199,90,90,0.35)]">
        <ShieldAlert className="w-5 h-5 text-[#C75A5A] animate-spin" />
        <span className="uppercase tracking-wider text-xs">{message}</span>
      </div>
    </div>
  );
};
