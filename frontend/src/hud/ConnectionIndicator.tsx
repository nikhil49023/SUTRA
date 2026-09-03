import React from 'react';
import { Radio, Wifi } from 'lucide-react';

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
    <div className="flex flex-col space-y-1 font-mono text-xs select-none w-28 sm:w-32">
      <div className="flex justify-between items-center bg-[#11171E] px-2 py-1 rounded border border-[#2B3743]">
        <div className="flex items-center space-x-1 text-[#707C88] text-[9px] font-bold">
          <Radio className="w-3 h-3 text-[#5B8FB9]" />
          <span>MODE</span>
        </div>
        <span className="font-bold text-[#5B8FB9] text-[10px] uppercase px-1.5 py-0.2 bg-[#151D26] rounded border border-[#5B8FB9]/40">
          {flightMode}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1 text-[10px]">
        <div className="bg-[#151D26] px-1.5 py-0.5 rounded border border-[#2B3743] flex flex-col">
          <span className="text-[#707C88] text-[8px]">RSSI</span>
          <span className="text-[#4F9A72] tabular-nums font-bold">{rssi.toFixed(0)} dBm</span>
        </div>
        <div className="bg-[#151D26] px-1.5 py-0.5 rounded border border-[#2B3743] flex flex-col">
          <span className="text-[#707C88] text-[8px]">LATENCY</span>
          <span className="text-[#A9B3BD] tabular-nums font-bold">{latencyMs.toFixed(0)} ms</span>
        </div>
      </div>
    </div>
  );
};
