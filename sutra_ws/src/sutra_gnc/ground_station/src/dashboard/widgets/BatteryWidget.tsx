import React from 'react';
import { Zap } from 'lucide-react';

interface BatteryWidgetProps {
  batteryRemaining: number;
  voltage: number;
}

export const BatteryWidget: React.FC<BatteryWidgetProps> = ({ batteryRemaining, voltage }) => {
  return (
    <div className="bg-[#070d1a]/90 backdrop-blur border border-[#1b253b] p-3 rounded-xl shadow-xl text-xs font-mono space-y-1.5">
      <div className="flex items-center justify-between text-slate-400 font-bold border-b border-slate-800 pb-1">
        <span className="flex items-center space-x-1.5">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <span>BATTERY HEALTH</span>
        </span>
        <span className="text-[10px] text-emerald-400 font-bold">{batteryRemaining}%</span>
      </div>
      <div className="h-2 w-full bg-slate-900 rounded overflow-hidden">
        <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${batteryRemaining}%` }} />
      </div>
      <div className="flex justify-between text-[11px] text-slate-400">
        <span>Bus Voltage:</span>
        <span className="text-white font-bold">{voltage} V</span>
      </div>
    </div>
  );
};
