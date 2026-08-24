import React from 'react';
import { Battery, BatteryCharging, BatteryWarning } from 'lucide-react';

interface BatteryIndicatorProps {
  batteryPercent: number;
  batteryVoltage: number;
  batteryCurrent: number;
}

export const BatteryIndicator: React.FC<BatteryIndicatorProps> = ({
  batteryPercent,
  batteryVoltage,
  batteryCurrent,
}) => {
  const isLow = batteryPercent <= 20;
  const isCritical = batteryPercent <= 10;

  return (
    <div className="flex flex-col space-y-1 font-mono text-xs select-none">
      <div className="flex justify-between items-center bg-slate-900/80 px-2 py-1 rounded border border-slate-700">
        <div className="flex items-center space-x-1.5">
          {isCritical ? (
            <BatteryWarning className="w-4 h-4 text-rose-400 animate-pulse" />
          ) : isLow ? (
            <BatteryWarning className="w-4 h-4 text-amber-400" />
          ) : (
            <Battery className="w-4 h-4 text-emerald-400" />
          )}
          <span className="text-[10px] text-slate-400">BATTERY</span>
        </div>
        <span
          className={`font-bold text-sm tabular-nums ${
            isCritical
              ? 'text-rose-400 animate-pulse'
              : isLow
              ? 'text-amber-400'
              : 'text-emerald-400'
          }`}
        >
          {batteryPercent.toFixed(0)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isCritical ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${Math.max(0, Math.min(100, batteryPercent))}%` }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-slate-400 px-1">
        <span>{batteryVoltage.toFixed(1)}V</span>
        <span>{batteryCurrent.toFixed(1)}A</span>
      </div>
    </div>
  );
};
