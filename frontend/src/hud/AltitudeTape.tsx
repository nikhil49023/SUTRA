import React from 'react';
import { ArrowUp, ArrowDown, Minus, Mountain } from 'lucide-react';

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
  const isClimbing = verticalSpeed > 0.3;
  const isDescending = verticalSpeed < -0.3;

  return (
    <div className="flex flex-col space-y-1 font-mono text-xs select-none w-28 sm:w-32">
      <div className="flex justify-between items-center bg-[#11171E] px-2 py-1 rounded border border-[#2B3743]">
        <div className="flex items-center space-x-1 text-[#707C88] text-[9px] font-bold">
          <Mountain className="w-3 h-3 text-[#5B8FB9]" />
          <span>ALT AGL</span>
        </div>
        <span className="font-bold text-[#E7EBEF] text-xs sm:text-sm tabular-nums">
          {altitudeAgl.toFixed(1)} <span className="text-[9px] font-normal text-[#707C88]">m</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1 text-[10px]">
        <div className="bg-[#151D26] px-1.5 py-0.5 rounded border border-[#2B3743] flex flex-col">
          <span className="text-[#707C88] text-[8px]">MSL</span>
          <span className="text-[#A9B3BD] tabular-nums font-bold">{altitudeMsl.toFixed(0)} m</span>
        </div>
        <div className="bg-[#151D26] px-1.5 py-0.5 rounded border border-[#2B3743] flex items-center justify-between">
          <div className="flex items-center space-x-0.5">
            {isClimbing ? (
              <ArrowUp className="w-3 h-3 text-[#4F9A72]" />
            ) : isDescending ? (
              <ArrowDown className="w-3 h-3 text-[#C75A5A]" />
            ) : (
              <Minus className="w-3 h-3 text-[#707C88]" />
            )}
            <span className={`tabular-nums font-bold text-[10px] ${isClimbing ? 'text-[#4F9A72]' : isDescending ? 'text-[#C75A5A]' : 'text-[#A9B3BD]'}`}>
              {Math.abs(verticalSpeed).toFixed(1)}
            </span>
          </div>
          <span className="text-[8px] text-[#707C88]">m/s</span>
        </div>
      </div>
    </div>
  );
};
