import React from 'react';
import { Activity } from 'lucide-react';
import type { TelemetryData } from '../../types';

interface TelemetryWidgetProps {
  telemetry: TelemetryData;
}

export const TelemetryWidget: React.FC<TelemetryWidgetProps> = ({ telemetry }) => {
  return (
    <div className="bg-[#070d1a]/90 backdrop-blur border border-[#1b253b] p-3 rounded-xl shadow-xl text-xs font-mono space-y-1.5">
      <div className="flex items-center justify-between text-slate-400 font-bold border-b border-slate-800 pb-1">
        <span className="flex items-center space-x-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>TELEMETRY METRICS</span>
        </span>
        <span className="text-[10px] text-emerald-400 font-bold">LIVE</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-slate-300">
        <div><span className="text-slate-500 block">ALT AGL:</span><span className="text-cyan-400 font-bold">{telemetry.altitudeAGL} m</span></div>
        <div><span className="text-slate-500 block">SPEED:</span><span className="text-white font-bold">{telemetry.groundSpeed} km/h</span></div>
        <div><span className="text-slate-500 block">P/R/Y:</span><span className="text-slate-300">{telemetry.pitch.toFixed(1)}° / {telemetry.roll.toFixed(1)}°</span></div>
        <div><span className="text-slate-500 block">SAT:</span><span className="text-emerald-400 font-bold">{telemetry.satellites} Sats</span></div>
      </div>
    </div>
  );
};
