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
      <div className="flex justify-between items-center bg-[#11171E] px-2 py-1 rounded border border-[#2B3743]">
        <span className="text-[10px] text-[#707C88]">ALT AGL</span>
        <span className="font-bold text-[#E7EBEF] text-sm tabular-nums">
          {altitudeAgl.toFixed(1)} <span className="text-[10px] font-normal text-[#A9B3BD]">m</span>
        </span>
      </div>

      <div className="flex justify-between items-center bg-[#151D26] px-2 py-0.5 rounded border border-[#2B3743] text-[11px]">
        <span className="text-[#707C88]">MSL</span>
        <span className="text-[#E7EBEF] tabular-nums">{altitudeMsl.toFixed(1)} m</span>
      </div>

      <div className="flex justify-between items-center bg-[#151D26] px-2 py-0.5 rounded border border-[#2B3743] text-[11px]">
        <span className="text-[#707C88]">V.SPD</span>
        <span className={`tabular-nums font-bold ${verticalSpeed > 0.3 ? 'text-[#4F9A72]' : verticalSpeed < -0.3 ? 'text-[#C75A5A]' : 'text-[#E7EBEF]'}`}>
          {verticalSpeed >= 0 ? '+' : ''}{verticalSpeed.toFixed(1)} m/s
        </span>
      </div>
    </div>
  );
};
