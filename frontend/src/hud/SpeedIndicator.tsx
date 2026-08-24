import React from 'react';

interface SpeedIndicatorProps {
  groundSpeed: number;
  airSpeed: number;
}

export const SpeedIndicator: React.FC<SpeedIndicatorProps> = ({ groundSpeed, airSpeed }) => {
  return (
    <div className="flex flex-col space-y-1 font-mono text-xs select-none">
      <div className="flex justify-between items-center bg-slate-900/80 px-2 py-1 rounded border border-slate-700">
        <span className="text-[10px] text-slate-400">GND SPD</span>
        <span className="font-bold text-cyan-300 text-sm tabular-nums">
          {groundSpeed.toFixed(1)} <span className="text-[10px] font-normal">m/s</span>
        </span>
      </div>

      <div className="flex justify-between items-center bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
        <span className="text-slate-500">AIR SPD</span>
        <span className="text-slate-300 tabular-nums">{airSpeed.toFixed(1)} m/s</span>
      </div>

      <div className="flex justify-between items-center bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
        <span className="text-slate-500">KM/H</span>
        <span className="text-slate-300 tabular-nums">{(groundSpeed * 3.6).toFixed(1)}</span>
      </div>
    </div>
  );
};
