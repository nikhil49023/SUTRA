import React from 'react';

interface AltimeterProps {
  altitudeAGL: number;
  altitudeMSL: number;
  climbRate: number;
}

export const Altimeter: React.FC<AltimeterProps> = ({ altitudeAGL, altitudeMSL, climbRate }) => {
  return (
    <div className="w-24 bg-[#060b14]/95 border border-[#1b253b] rounded-lg p-2.5 flex flex-col justify-between font-mono select-none shadow-2xl z-30">
      <div className="border-b border-[#1b253b] pb-1 text-center">
        <span className="text-[10px] font-bold text-cyan-400 block uppercase">ALTITUDE</span>
        <span className="text-xl font-extrabold text-emerald-400">{Math.round(altitudeAGL)}</span>
        <span className="text-[9px] text-slate-400 block">METERS AGL</span>
      </div>

      <div className="pt-2 text-center border-t border-[#1b253b] space-y-1">
        <div className="text-[9px] text-slate-400 flex justify-between">
          <span>MSL:</span>
          <span className="text-slate-200 font-bold">{Math.round(altitudeMSL)}m</span>
        </div>
        <div className="text-[9px] text-slate-400 flex justify-between">
          <span>VSI:</span>
          <span className={climbRate >= 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
            {climbRate >= 0 ? `+${climbRate}` : climbRate} m/s
          </span>
        </div>
      </div>
    </div>
  );
};
