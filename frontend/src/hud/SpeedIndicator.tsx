import React from 'react';

interface SpeedIndicatorProps {
  groundSpeed: number;
  airSpeed: number;
}

export const SpeedIndicator: React.FC<SpeedIndicatorProps> = ({ groundSpeed, airSpeed }) => {
  return (
    <div className="flex flex-col space-y-1 font-mono text-xs select-none">
      <div className="flex justify-between items-center bg-[#11171E] px-2 py-1 rounded border border-[#2B3743]">
        <span className="text-[10px] text-[#707C88]">GND SPD</span>
        <span className="font-bold text-[#E7EBEF] text-sm tabular-nums">
          {groundSpeed.toFixed(1)} <span className="text-[10px] font-normal text-[#A9B3BD]">m/s</span>
        </span>
      </div>

      <div className="flex justify-between items-center bg-[#151D26] px-2 py-0.5 rounded border border-[#2B3743] text-[11px]">
        <span className="text-[#707C88]">AIR SPD</span>
        <span className="text-[#E7EBEF] tabular-nums">{airSpeed.toFixed(1)} m/s</span>
      </div>

      <div className="flex justify-between items-center bg-[#151D26] px-2 py-0.5 rounded border border-[#2B3743] text-[11px]">
        <span className="text-[#707C88]">KM/H</span>
        <span className="text-[#E7EBEF] tabular-nums">{(groundSpeed * 3.6).toFixed(1)}</span>
      </div>
    </div>
  );
};
