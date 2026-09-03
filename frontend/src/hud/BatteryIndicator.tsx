import React from 'react';
import { Battery, BatteryWarning } from 'lucide-react';

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
    <div className="flex flex-col space-y-1 font-mono text-xs select-none w-28 sm:w-32">
      <div className="flex justify-between items-center bg-[#11171E] px-2 py-1 rounded border border-[#2B3743]">
        <div className="flex items-center space-x-1 text-[#707C88] text-[9px] font-bold">
          {isCritical ? (
            <BatteryWarning className="w-3 h-3 text-[#C75A5A] animate-pulse" />
          ) : isLow ? (
            <BatteryWarning className="w-3 h-3 text-[#C49A4A]" />
          ) : (
            <Battery className="w-3 h-3 text-[#4F9A72]" />
          )}
          <span>BATT</span>
        </div>
        <span
          className={`font-bold text-xs sm:text-sm tabular-nums ${
            isCritical
              ? 'text-[#C75A5A] animate-pulse'
              : isLow
              ? 'text-[#C49A4A]'
              : 'text-[#4F9A72]'
          }`}
        >
          {batteryPercent.toFixed(0)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#151D26] h-1.5 rounded-full overflow-hidden border border-[#2B3743]">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isCritical ? 'bg-[#C75A5A]' : isLow ? 'bg-[#C49A4A]' : 'bg-[#4F9A72]'
          }`}
          style={{ width: `${Math.max(0, Math.min(100, batteryPercent))}%` }}
        />
      </div>

      <div className="flex justify-between text-[9px] text-[#707C88] bg-[#151D26] px-1.5 py-0.5 rounded border border-[#2B3743] tabular-nums">
        <span>{batteryVoltage.toFixed(1)} V</span>
        <span>{batteryCurrent.toFixed(1)} A</span>
      </div>
    </div>
  );
};
