import React from 'react';

interface ArtificialHorizonProps {
  pitch: number; // degrees (-90 to +90)
  roll: number;  // degrees (-180 to +180)
}

export const ArtificialHorizon: React.FC<ArtificialHorizonProps> = ({ pitch, roll }) => {
  // Pitch pixel offset (each degree = 2.5px)
  const pitchOffsetPx = pitch * 2.5;

  return (
    <div className="relative w-48 h-48 rounded-full overflow-hidden border-2 border-cyan-500/40 bg-slate-950/80 shadow-inner flex items-center justify-center select-none">
      {/* Pitch & Roll Rotating Instrument Disc */}
      <div
        className="absolute w-72 h-72 transition-transform duration-75 ease-linear"
        style={{
          transform: `rotate(${-roll}deg) translateY(${pitchOffsetPx}px)`,
        }}
      >
        {/* Sky Half */}
        <div className="w-full h-36 bg-gradient-to-b from-sky-900/60 to-sky-700/50 border-b border-white" />
        {/* Ground Half */}
        <div className="w-full h-36 bg-gradient-to-b from-amber-950/60 to-amber-900/40" />

        {/* Pitch Ladder Marks inside disk */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {[-30, -20, -10, 10, 20, 30].map((deg) => (
            <div
              key={deg}
              className="absolute flex items-center space-x-1"
              style={{ top: `calc(50% - ${deg * 2.5}px)` }}
            >
              <span className="text-[8px] font-mono text-cyan-300">{Math.abs(deg)}</span>
              <div className="w-6 h-[1.5px] bg-cyan-400" />
              <div className="w-4 h-[1.5px] bg-transparent" />
              <div className="w-6 h-[1.5px] bg-cyan-400" />
              <span className="text-[8px] font-mono text-cyan-300">{Math.abs(deg)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Fixed Aircraft Reticle (Boresight) */}
      <div className="relative z-10 pointer-events-none flex items-center justify-center">
        <div className="w-5 h-[2px] bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
        <div className="w-2.5 h-2.5 rounded-full border-2 border-amber-400 bg-black/50" />
        <div className="w-5 h-[2px] bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
      </div>

      {/* Roll Indicator Arc Top */}
      <div className="absolute top-1 z-20 pointer-events-none flex flex-col items-center">
        <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-amber-400" />
        <span className="text-[9px] font-mono font-bold text-amber-400 mt-0.5">
          {roll.toFixed(1)}°
        </span>
      </div>
    </div>
  );
};
