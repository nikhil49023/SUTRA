import React from 'react';

interface ArtificialHorizonProps {
  pitch: number;
  roll: number;
}

export const ArtificialHorizon: React.FC<ArtificialHorizonProps> = ({ pitch, roll }) => {
  return (
    <div className="relative w-full h-full bg-[#040812] overflow-hidden flex items-center justify-center select-none font-mono">
      {/* 1. ROTATING SKY / GROUND HORIZON PLANE */}
      <div
        className="absolute inset-0 transition-transform duration-75 flex flex-col items-center justify-center"
        style={{ transform: `rotate(${roll}deg) translateY(${pitch * 3.5}px)` }}
      >
        {/* Sky Box (Cyan/Blue) */}
        <div className="w-[220%] h-[350px] bg-gradient-to-b from-cyan-900/60 via-cyan-800/40 to-cyan-500/20 border-b-2 border-cyan-400 flex items-end justify-center pb-2">
          <span className="text-[10px] text-cyan-300 font-bold tracking-widest uppercase">SKY</span>
        </div>
        {/* Ground Box (Amber/Brown) */}
        <div className="w-[220%] h-[350px] bg-gradient-to-t from-amber-950/80 via-amber-900/40 to-amber-700/20 flex items-start justify-center pt-2">
          <span className="text-[10px] text-amber-400 font-bold tracking-widest uppercase">GND</span>
        </div>
      </div>

      {/* 2. FIXED AIRCRAFT REFERENCE SYMBOL (YELLOW RETICLE) */}
      <div className="absolute z-30 w-32 h-6 flex items-center justify-between pointer-events-none">
        {/* Left Wing Bar */}
        <div className="w-10 h-1.5 border-t-2 border-b-2 border-amber-400 bg-amber-400/40 rounded-l"></div>
        {/* Center Target Box */}
        <div className="w-4 h-4 border-2 border-amber-400 rounded-full flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
        </div>
        {/* Right Wing Bar */}
        <div className="w-10 h-1.5 border-t-2 border-b-2 border-amber-400 bg-amber-400/40 rounded-r"></div>
      </div>

      {/* 3. ROLL BANK ANGLE POINTER AT TOP */}
      <div className="absolute top-2 z-30 flex flex-col items-center">
        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-cyan-400"></div>
        <span className="text-[9px] text-cyan-300 font-bold bg-black/60 px-1 py-0.5 rounded mt-0.5 border border-cyan-500/30">
          BANK {Math.round(roll)}°
        </span>
      </div>
    </div>
  );
};
