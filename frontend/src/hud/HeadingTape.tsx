import React from 'react';

interface HeadingTapeProps {
  heading: number; // 0 - 360 deg
}

export const HeadingTape: React.FC<HeadingTapeProps> = ({ heading }) => {
  const normalizedHeading = (heading + 360) % 360;

  // Cardinal point helper
  const getCardinal = (deg: number) => {
    const d = (deg + 360) % 360;
    if (d >= 337.5 || d < 22.5) return 'N';
    if (d >= 22.5 && d < 67.5) return 'NE';
    if (d >= 67.5 && d < 112.5) return 'E';
    if (d >= 112.5 && d < 157.5) return 'SE';
    if (d >= 157.5 && d < 202.5) return 'S';
    if (d >= 202.5 && d < 247.5) return 'SW';
    if (d >= 247.5 && d < 292.5) return 'W';
    return 'NW';
  };

  return (
    <div className="relative w-48 h-9 rounded bg-[#11171E]/95 border border-[#2B3743] overflow-hidden flex items-center justify-center select-none font-mono">
      {/* Sliding tape */}
      <div
        className="absolute flex items-center space-x-6 transition-transform duration-75"
        style={{
          transform: `translateX(${-((normalizedHeading % 360) * 3 - 72)}px)`,
        }}
      >
        {Array.from({ length: 72 }).map((_, i) => {
          const deg = i * 10;
          const isCardinal = deg % 90 === 0;
          return (
            <div key={deg} className="flex flex-col items-center w-6">
              <span className={`text-[9px] font-bold ${isCardinal ? 'text-[#E7EBEF]' : 'text-[#707C88]'}`}>
                {deg % 90 === 0 ? getCardinal(deg) : deg}
              </span>
              <div className={`h-1.5 w-[1.5px] ${isCardinal ? 'bg-[#E7EBEF]' : 'bg-[#3A4856]'}`} />
            </div>
          );
        })}
      </div>

      {/* Center Pointer Triangle */}
      <div className="absolute top-0 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-[#E7EBEF] z-10" />

      {/* Current heading numeric readout */}
      <div className="absolute bottom-0.5 px-1.5 py-0.2 bg-[#0B0F14]/90 rounded border border-[#5B8FB9] text-[10px] font-bold text-[#E7EBEF] z-10 tabular-nums">
        {Math.round(normalizedHeading).toString().padStart(3, '0')}° {getCardinal(normalizedHeading)}
      </div>
    </div>
  );
};
