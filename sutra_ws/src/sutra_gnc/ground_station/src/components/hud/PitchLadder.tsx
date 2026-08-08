import React from 'react';

interface PitchLadderProps {
  pitch: number;
}

export const PitchLadder: React.FC<PitchLadderProps> = ({ pitch }) => {
  const pitchRungs = [-60, -50, -40, -30, -20, -10, 10, 20, 30, 40, 50, 60];

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none font-mono">
      <div
        className="relative transition-transform duration-75 flex flex-col items-center space-y-8"
        style={{ transform: `translateY(${pitch * 3.5}px)` }}
      >
        {pitchRungs.map((deg) => (
          <div key={deg} className="flex items-center space-x-3 text-[10px] font-bold text-cyan-300">
            <span>{deg > 0 ? `+${deg}` : deg}</span>
            <div className="w-16 h-0.5 bg-cyan-400/80 border-t border-cyan-300"></div>
            <span>{deg > 0 ? `+${deg}` : deg}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
