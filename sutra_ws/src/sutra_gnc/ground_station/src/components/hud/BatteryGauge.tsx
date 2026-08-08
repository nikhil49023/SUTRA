import React from 'react';

interface BatteryGaugeProps {
  remainingPercent: number;
  voltage: number;
  current: number;
}

export const BatteryGauge: React.FC<BatteryGaugeProps> = ({ remainingPercent, voltage, current }) => {
  return (
    <div className="w-28 bg-[#060b14]/95 border border-[#1b253b] rounded-lg p-2.5 flex flex-col justify-between font-mono select-none shadow-2xl z-30">
      <div className="flex items-center justify-between border-b border-[#1b253b] pb-1">
        <span className="text-[10px] font-bold text-cyan-400 uppercase">BATTERY</span>
        <span className={`text-xs font-black ${remainingPercent > 30 ? 'text-emerald-400' : 'text-red-400 animate-pulse'}`}>
          {remainingPercent}%
        </span>
      </div>

      <div className="w-full bg-[#0a1120] h-2 rounded-full border border-slate-800 my-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            remainingPercent > 30 ? 'bg-gradient-to-r from-cyan-500 to-emerald-400' : 'bg-red-500'
          }`}
          style={{ width: `${remainingPercent}%` }}
        />
      </div>

      <div className="text-[9px] text-slate-400 space-y-0.5 border-t border-[#1b253b] pt-1">
        <div className="flex justify-between"><span>Voltage:</span><span className="text-white font-bold">{voltage}V</span></div>
        <div className="flex justify-between"><span>Current:</span><span className="text-amber-400 font-bold">{current}A</span></div>
      </div>
    </div>
  );
};
