import React from 'react';
import { Cloud, Wind, Droplets, Sun, Compass } from 'lucide-react';

export const WeatherPanel: React.FC = () => {
  return (
    <div className="bg-[#0f141c]/90 border border-slate-800 rounded-lg p-3 font-mono text-xs space-y-3 select-none">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-1.5 font-bold text-slate-200">
          <Cloud className="w-3.5 h-3.5 text-cyan-400" />
          <span>TACTICAL METEOROLOGICAL CONDITIONS</span>
        </div>
        <span className="text-[10px] text-emerald-400 font-bold">VMC (SAFE)</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
          <div className="flex items-center space-x-1 text-slate-400 text-[10px]">
            <Wind className="w-3 h-3 text-cyan-400" />
            <span>WIND SPEED & VECTOR</span>
          </div>
          <div className="font-bold text-slate-200 mt-0.5 tabular-nums">
            4.2 m/s @ 230° (SW)
          </div>
        </div>

        <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
          <div className="flex items-center space-x-1 text-slate-400 text-[10px]">
            <Sun className="w-3 h-3 text-amber-400" />
            <span>TEMPERATURE / QNH</span>
          </div>
          <div className="font-bold text-slate-200 mt-0.5 tabular-nums">
            21.5°C · 1013.2 hPa
          </div>
        </div>

        <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
          <div className="flex items-center space-x-1 text-slate-400 text-[10px]">
            <Droplets className="w-3 h-3 text-blue-400" />
            <span>HUMIDITY / DEW POINT</span>
          </div>
          <div className="font-bold text-slate-200 mt-0.5 tabular-nums">
            58% · 13.0°C
          </div>
        </div>

        <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
          <div className="flex items-center space-x-1 text-slate-400 text-[10px]">
            <Cloud className="w-3 h-3 text-slate-400" />
            <span>CEILING / VISIBILITY</span>
          </div>
          <div className="font-bold text-slate-200 mt-0.5 tabular-nums">
            UNLIMITED · &gt; 10 km
          </div>
        </div>
      </div>
    </div>
  );
};
