import React from 'react';

interface AltitudeTapeProps {
  altitudeMsl: number;
  altitudeAgl: number;
  verticalSpeed: number;
}

export const AltitudeTape: React.FC<AltitudeTapeProps> = ({
  altitudeMsl,
  altitudeAgl,
  verticalSpeed,
}) => {
  return (
    <div className="flex flex-col space-y-1 font-mono text-xs select-none">
      <div className="flex justify-between items-center bg-slate-900/80 px-2 py-1 rounded border border-slate-700">
        <span className="text-[10px] text-slate-400">ALT AGL</span>
        <span className="font-bold text-cyan-300 text-sm tabular-nums">
          {altitudeAgl.toFixed(1)} <span className="text-[10px] font-normal">m</span>
        </span>
      </div>

      <div className="flex justify-between items-center bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
        <span className="text-slate-500">MSL</span>
        <span className="text-slate-300 tabular-nums">{altitudeMsl.toFixed(1)} m</span>
      </div>

      <div className="flex justify-between items-center bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
        <span className="text-slate-500">V.SPD</span>
        <span className={`tabular-nums font-bold ${verticalSpeed > 0.3 ? 'text-emerald-400' : verticalSpeed < -0.3 ? 'text-rose-400' : 'text-slate-300'}`}>
          {verticalSpeed >= 0 ? '+' : ''}{verticalSpeed.toFixed(1)} m/s
        </span>
      </div>
    </div>
  );
};
