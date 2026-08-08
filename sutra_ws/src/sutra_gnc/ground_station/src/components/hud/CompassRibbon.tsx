import React from 'react';

interface CompassRibbonProps {
  heading: number;
}

export const CompassRibbon: React.FC<CompassRibbonProps> = ({ heading }) => {
  const cardinalPoints = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

  return (
    <div className="w-full bg-[#060b14]/90 border-b border-[#1b253b] px-4 py-1.5 flex items-center justify-between font-mono text-xs z-30 select-none">
      <div className="flex items-center space-x-2">
        <span className="text-cyan-400 font-bold uppercase">COMPASS TAPE</span>
        <span className="text-slate-500">|</span>
        <span className="text-white font-bold bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
          HDG {Math.round((heading + 360) % 360)}°
        </span>
      </div>

      <div className="flex items-center space-x-4 text-[11px] font-bold text-slate-300">
        {cardinalPoints.map((pt, idx) => {
          const ptDeg = idx * 45;
          const diff = Math.abs(heading - ptDeg);
          const isActive = diff < 22.5 || diff > 337.5;
          return (
            <span
              key={pt}
              className={`px-1.5 py-0.5 rounded transition-all ${
                isActive ? 'bg-cyan-500 text-white font-black shadow-md shadow-cyan-500/40' : 'text-slate-500'
              }`}
            >
              {pt} ({ptDeg}°)
            </span>
          );
        })}
      </div>
    </div>
  );
};
