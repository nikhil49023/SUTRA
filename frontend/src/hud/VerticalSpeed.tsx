import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface VerticalSpeedProps {
  verticalSpeed: number;
}

export const VerticalSpeed: React.FC<VerticalSpeedProps> = ({ verticalSpeed }) => {
  return (
    <div className="flex items-center space-x-1 font-mono text-xs">
      {verticalSpeed > 0.2 ? (
        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
      ) : verticalSpeed < -0.2 ? (
        <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
      ) : (
        <Minus className="w-3.5 h-3.5 text-slate-400" />
      )}
      <span className={`font-bold tabular-nums ${verticalSpeed > 0.2 ? 'text-emerald-400' : verticalSpeed < -0.2 ? 'text-rose-400' : 'text-slate-300'}`}>
        {verticalSpeed.toFixed(1)} m/s
      </span>
    </div>
  );
};
