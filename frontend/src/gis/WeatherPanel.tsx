import React from 'react';
import { Cloud, Wind, Droplets, Sun } from 'lucide-react';

export const WeatherPanel: React.FC = () => {
  return (
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 sm:p-4 font-mono text-xs space-y-3 select-none">
      <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-[#151D26] border border-[#5B8FB9]/40 flex items-center justify-center">
            <Cloud className="w-3.5 h-3.5 text-[#5B8FB9]" />
          </div>
          <div>
            <span className="font-bold text-[#E7EBEF]">TACTICAL METEOROLOGICAL CONDITIONS</span>
            <span className="text-[10px] text-[#707C88] ml-2">// ENVIRONMENTAL SENSORS</span>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded bg-[#151D26] border border-[#4F9A72]/40 text-[#4F9A72] text-[10px] font-bold">
          VMC (FLIGHT ENVELOPE SAFE)
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
        <div className="bg-[#151D26] p-2.5 rounded border border-[#2B3743]">
          <div className="flex items-center space-x-1 text-[#707C88] text-[10px]">
            <Wind className="w-3 h-3 text-[#5B8FB9]" />
            <span>WIND SPEED & DIR</span>
          </div>
          <div className="font-bold text-[#E7EBEF] mt-1 tabular-nums">
            4.2 m/s @ 230° (SW)
          </div>
        </div>

        <div className="bg-[#151D26] p-2.5 rounded border border-[#2B3743]">
          <div className="flex items-center space-x-1 text-[#707C88] text-[10px]">
            <Sun className="w-3 h-3 text-[#C49A4A]" />
            <span>TEMPERATURE / QNH</span>
          </div>
          <div className="font-bold text-[#E7EBEF] mt-1 tabular-nums">
            21.5°C · 1013.2 hPa
          </div>
        </div>

        <div className="bg-[#151D26] p-2.5 rounded border border-[#2B3743]">
          <div className="flex items-center space-x-1 text-[#707C88] text-[10px]">
            <Droplets className="w-3 h-3 text-[#5B8FB9]" />
            <span>HUMIDITY / DEW</span>
          </div>
          <div className="font-bold text-[#E7EBEF] mt-1 tabular-nums">
            58% · 13.0°C
          </div>
        </div>

        <div className="bg-[#151D26] p-2.5 rounded border border-[#2B3743]">
          <div className="flex items-center space-x-1 text-[#707C88] text-[10px]">
            <Cloud className="w-3 h-3 text-[#707C88]" />
            <span>CEILING / VISIBILITY</span>
          </div>
          <div className="font-bold text-[#E7EBEF] mt-1 tabular-nums">
            UNLIMITED · &gt; 10 km
          </div>
        </div>
      </div>
    </div>
  );
};
