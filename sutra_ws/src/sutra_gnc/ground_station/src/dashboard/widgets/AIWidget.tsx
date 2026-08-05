import React from 'react';
import { Cpu } from 'lucide-react';

export const AIWidget: React.FC = () => {
  return (
    <div className="bg-[#070d1a]/90 backdrop-blur border border-[#1b253b] p-3 rounded-xl shadow-xl text-xs font-mono space-y-1">
      <div className="flex items-center justify-between text-slate-400 font-bold border-b border-slate-800 pb-1">
        <span className="flex items-center space-x-1.5">
          <Cpu className="w-3.5 h-3.5 text-purple-400" />
          <span>AI THREAT RADAR</span>
        </span>
        <span className="text-[10px] text-emerald-400 font-bold">NORMAL</span>
      </div>
      <div className="text-[11px] text-slate-400 pt-1">
        No critical threats detected on active operational vector.
      </div>
    </div>
  );
};
