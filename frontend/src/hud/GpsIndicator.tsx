import React from 'react';
import { Satellite, Navigation2 } from 'lucide-react';

interface GpsIndicatorProps {
  satellites: number;
  hdop: number;
  fixType: number;
  lat: number;
  lon: number;
}

export const GpsIndicator: React.FC<GpsIndicatorProps> = ({
  satellites,
  hdop,
  fixType,
  lat,
  lon,
}) => {
  return (
    <div className="flex flex-col space-y-1 font-mono text-xs select-none">
      <div className="flex justify-between items-center bg-slate-900/80 px-2 py-1 rounded border border-slate-700">
        <div className="flex items-center space-x-1.5">
          <Satellite className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[10px] text-slate-400">GPS FIX</span>
        </div>
        <span className="font-bold text-emerald-400 tabular-nums">
          {fixType === 3 ? '3D FIX' : fixType === 4 ? 'RTK' : '2D'}
        </span>
      </div>

      <div className="flex justify-between items-center bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
        <span className="text-slate-500">SATS / HDOP</span>
        <span className="text-slate-300 tabular-nums">{satellites} SAT ({hdop.toFixed(1)})</span>
      </div>

      <div className="text-[10px] text-slate-400 px-1 truncate tabular-nums">
        {lat.toFixed(5)}°, {lon.toFixed(5)}°
      </div>
    </div>
  );
};
