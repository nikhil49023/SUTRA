import React from 'react';

interface PitchLadderProps {
  pitch: number;
}

export const PitchLadder: React.FC<PitchLadderProps> = ({ pitch }) => {
  return (
    <div className="flex flex-col items-center font-mono text-xs text-slate-300">
      <span className="text-[10px] text-slate-400 uppercase tracking-wider">PITCH</span>
      <span className={`font-bold tabular-nums ${Math.abs(pitch) > 30 ? 'text-amber-400' : 'text-cyan-300'}`}>
        {pitch >= 0 ? '+' : ''}{pitch.toFixed(1)}°
      </span>
    </div>
  );
};
