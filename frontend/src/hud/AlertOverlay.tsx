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
      <div className="flex items-center space-x-2 px-4 py-2 bg-rose-950/90 border-2 border-rose-500 rounded-lg text-rose-200 font-mono font-bold shadow-[0_0_20px_rgba(239,68,68,0.5)]">
        <ShieldAlert className="w-5 h-5 text-rose-400 animate-spin" />
        <span className="uppercase tracking-wider text-xs">{message}</span>
      </div>
    </div>
  );
};
