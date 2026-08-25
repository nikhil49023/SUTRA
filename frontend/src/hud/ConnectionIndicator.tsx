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
      <div className="flex justify-between items-center bg-[#11171E] px-2 py-1 rounded border border-[#2B3743]">
        <div className="flex items-center space-x-1.5">
          <Radio className="w-3.5 h-3.5 text-[#5B8FB9]" />
          <span className="text-[10px] text-[#707C88]">MODE</span>
        </div>
        <span className="font-bold text-[#E7EBEF]">{flightMode}</span>
      </div>

      <div className="flex justify-between items-center bg-[#151D26] px-2 py-0.5 rounded border border-[#2B3743] text-[11px]">
        <span className="text-[#707C88]">LINK RSSI</span>
        <span className="text-[#4F9A72] tabular-nums">{rssi.toFixed(0)} dBm</span>
      </div>

      <div className="flex justify-between items-center bg-[#151D26] px-2 py-0.5 rounded border border-[#2B3743] text-[11px]">
        <span className="text-[#707C88]">LATENCY</span>
        <span className="text-[#E7EBEF] tabular-nums">{latencyMs.toFixed(0)} ms</span>
      </div>
    </div>
  );
};
