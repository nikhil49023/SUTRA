import React from 'react';
import { Gauge } from 'lucide-react';

interface SpeedIndicatorProps {
  groundSpeed: number;
  airSpeed: number;
}

export const SpeedIndicator: React.FC<SpeedIndicatorProps> = ({ groundSpeed, airSpeed }) => {
  return (
    <div className="flex flex-col space-y-1 font-mono text-xs select-none w-28 sm:w-32">
      <div className="flex justify-between items-center bg-[#11171E] px-2 py-1 rounded border border-[#2B3743]">
        <div className="flex items-center space-x-1 text-[#707C88] text-[9px] font-bold">
          <Gauge className="w-3 h-3 text-[#5B8FB9]" />
          <span>GND SPD</span>
        </div>
        <span className="font-bold text-[#E7EBEF] text-xs sm:text-sm tabular-nums">
          {groundSpeed.toFixed(1)} <span className="text-[9px] font-normal text-[#707C88]">m/s</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1 text-[10px]">
        <div className="bg-[#151D26] px-1.5 py-0.5 rounded border border-[#2B3743] flex flex-col">
          <span className="text-[#707C88] text-[8px]">AIR SPD</span>
          <span className="text-[#A9B3BD] tabular-nums font-bold">{airSpeed.toFixed(1)} m/s</span>
        </div>
        <div className="bg-[#151D26] px-1.5 py-0.5 rounded border border-[#2B3743] flex flex-col">
          <span className="text-[#707C88] text-[8px]">KM/H</span>
          <span className="text-[#A9B3BD] tabular-nums font-bold">{(groundSpeed * 3.6).toFixed(0)}</span>
        </div>
      </div>
    </div>
  );
};
