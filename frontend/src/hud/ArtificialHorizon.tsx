import React from 'react';

interface ArtificialHorizonProps {
  pitch: number; // degrees (-90 to +90)
  roll: number;  // degrees (-180 to +180)
}

export const ArtificialHorizon: React.FC<ArtificialHorizonProps> = ({ pitch, roll }) => {
  // Pitch pixel offset (each degree = 2.5px)
  const pitchOffsetPx = pitch * 2.5;

  return (
    <div className="relative w-48 h-48 rounded-full overflow-hidden border-2 border-[#2B3743] bg-[#0B0F14]/90 shadow-inner flex items-center justify-center select-none">
      {/* Pitch & Roll Rotating Instrument Disc */}
      <div
        className="absolute w-72 h-72 transition-transform duration-75 ease-linear"
        style={{
          transform: `rotate(${-roll}deg) translateY(${pitchOffsetPx}px)`,
        }}
      >
        {/* Sky Half */}
        <div className="w-full h-36 bg-gradient-to-b from-[#1B2530] to-[#202B36] border-b border-[#E7EBEF]/80" />
        {/* Ground Half */}
        <div className="w-full h-36 bg-gradient-to-b from-[#151D26] to-[#11171E]" />

        {/* Pitch Ladder Marks inside disk */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {[-30, -20, -10, 10, 20, 30].map((deg) => (
            <div
              key={deg}
              className="absolute flex items-center space-x-1"
              style={{ top: `calc(50% - ${deg * 2.5}px)` }}
            >
              <span className="text-[8px] font-mono text-[#A9B3BD]">{Math.abs(deg)}</span>
              <div className="w-6 h-[1.5px] bg-[#707C88]" />
              <div className="w-4 h-[1.5px] bg-transparent" />
              <div className="w-6 h-[1.5px] bg-[#707C88]" />
              <span className="text-[8px] font-mono text-[#A9B3BD]">{Math.abs(deg)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Fixed Aircraft Reticle (Boresight) */}
      <div className="relative z-10 pointer-events-none flex items-center justify-center">
        <div className="w-5 h-[2px] bg-[#E7EBEF] shadow-[0_0_4px_rgba(231,235,239,0.5)]" />
        <div className="w-2.5 h-2.5 rounded-full border-2 border-[#E7EBEF] bg-[#0B0F14]/70" />
        <div className="w-5 h-[2px] bg-[#E7EBEF] shadow-[0_0_4px_rgba(231,235,239,0.5)]" />
      </div>

      {/* Roll Indicator Arc Top */}
      <div className="absolute top-1 z-20 pointer-events-none flex flex-col items-center">
        <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-[#E7EBEF]" />
        <span className="text-[9px] font-mono font-bold text-[#E7EBEF] mt-0.5">
          {roll.toFixed(1)}°
        </span>
      </div>
    </div>
  );
};
