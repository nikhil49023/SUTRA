import React from 'react';

interface AirspeedIndicatorProps {
  airSpeed: number;
  groundSpeed: number;
}

export const AirspeedIndicator: React.FC<AirspeedIndicatorProps> = ({ airSpeed, groundSpeed }) => {
  return (
    <div className="w-24 bg-[#060b14]/95 border border-[#1b253b] rounded-lg p-2.5 flex flex-col justify-between font-mono select-none shadow-2xl z-30">
      <div className="border-b border-[#1b253b] pb-1 text-center">
        <span className="text-[10px] font-bold text-cyan-400 block uppercase">AIRSPEED</span>
        <span className="text-xl font-extrabold text-white">{Math.round(airSpeed)}</span>
        <span className="text-[9px] text-slate-400 block">KM/H IAS</span>
      </div>

      <div className="pt-2 text-center border-t border-[#1b253b]">
        <span className="text-[9px] text-slate-400 block">GROUND SPEED</span>
        <span className="text-sm font-bold text-emerald-400">{Math.round(groundSpeed)} km/h</span>
      </div>
    </div>
  );
};
