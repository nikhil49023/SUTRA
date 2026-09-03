import React from 'react';

interface ArtificialHorizonProps {
  pitch: number; // degrees (-90 to +90)
  roll: number;  // degrees (-180 to +180)
}

export const ArtificialHorizon: React.FC<ArtificialHorizonProps> = ({ pitch, roll }) => {
  // Pitch pixel offset (each degree = 1.4px for compact 116px instrument)
  const pitchOffsetPx = Math.max(-40, Math.min(40, pitch * 1.4));

  return (
    <div className="relative w-28 h-28 rounded-full overflow-hidden border border-[#2B3743] bg-[#0B0F14] shadow-[inset_0_0_12px_rgba(0,0,0,0.8)] ring-1 ring-[#5B8FB9]/20 flex items-center justify-center select-none flex-shrink-0">
      {/* Pitch & Roll Rotating Instrument Disc */}
      <div
        className="absolute w-44 h-44 transition-transform duration-75 ease-linear"
        style={{
          transform: `rotate(${-roll}deg) translateY(${pitchOffsetPx}px)`,
        }}
      >
        {/* Sky Half */}
        <div className="w-full h-22 bg-gradient-to-b from-[#18232F] to-[#223344] border-b border-[#5B8FB9]/80 shadow-[0_1px_4px_rgba(91,143,185,0.4)]" />
        {/* Ground Half */}
        <div className="w-full h-22 bg-gradient-to-b from-[#1A1815] to-[#11171E]" />

        {/* Pitch Ladder Marks */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {[-20, -10, 10, 20].map((deg) => (
            <div
              key={deg}
              className="absolute flex items-center space-x-1"
              style={{ top: `calc(50% - ${deg * 1.4}px)` }}
            >
              <span className="text-[7px] font-mono text-[#707C88] tabular-nums">{Math.abs(deg)}</span>
              <div className="w-4 h-[1px] bg-[#E7EBEF]/60" />
              <div className="w-3 h-[1px] bg-transparent" />
              <div className="w-4 h-[1px] bg-[#E7EBEF]/60" />
              <span className="text-[7px] font-mono text-[#707C88] tabular-nums">{Math.abs(deg)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Outer Dial Roll Scale Ticks */}
      <div className="absolute inset-0 pointer-events-none rounded-full border border-white/5" />

      {/* Fixed Aircraft Reticle (Boresight Crosshair) */}
      <div className="relative z-10 pointer-events-none flex items-center justify-center">
        <div className="w-3.5 h-[2px] bg-[#5B8FB9] shadow-[0_0_6px_rgba(91,143,185,0.8)]" />
        <div className="w-2 h-2 rounded-full border border-[#5B8FB9] bg-[#0B0F14]/80 mx-0.5" />
        <div className="w-3.5 h-[2px] bg-[#5B8FB9] shadow-[0_0_6px_rgba(91,143,185,0.8)]" />
      </div>

      {/* Roll Indicator Arrow Top */}
      <div className="absolute top-1 z-20 pointer-events-none flex flex-col items-center">
        <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[5px] border-t-[#5B8FB9]" />
      </div>

      {/* Digital Gyro Readout Footer */}
      <div className="absolute bottom-1 z-20 px-1.5 py-0.2 bg-[#0B0F14]/90 rounded border border-[#2B3743] text-[8px] font-mono font-bold text-[#E7EBEF] tabular-nums shadow">
        P:{pitch >= 0 ? '+' : ''}{pitch.toFixed(0)}° R:{roll >= 0 ? '+' : ''}{roll.toFixed(0)}°
      </div>
    </div>
  );
};
