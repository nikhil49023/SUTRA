import React from 'react';
import { Signal, Radio } from 'lucide-react';

interface ConnectionIndicatorProps {
  rssi: number;
  latencyMs: number;
  flightMode: string;
}

export const ConnectionIndicator: React.FC<ConnectionIndicatorProps> = ({
  rssi,
  latencyMs,
  flightMode,
}) => {
  return (
    <div className="flex flex-col space-y-1 font-mono text-xs select-none">
      <div className="flex justify-between items-center bg-slate-900/80 px-2 py-1 rounded border border-slate-700">
        <div className="flex items-center space-x-1.5">
          <Radio className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[10px] text-slate-400">MODE</span>
        </div>
        <span className="font-bold text-cyan-300">{flightMode}</span>
      </div>

      <div className="flex justify-between items-center bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
        <span className="text-slate-500">LINK RSSI</span>
        <span className="text-emerald-400 tabular-nums">{rssi.toFixed(0)} dBm</span>
      </div>

      <div className="flex justify-between items-center bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
        <span className="text-slate-500">LATENCY</span>
        <span className="text-slate-300 tabular-nums">{latencyMs.toFixed(0)} ms</span>
      </div>
    </div>
  );
};
