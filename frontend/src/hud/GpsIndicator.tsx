import React from 'react';
import { Satellite } from 'lucide-react';

interface GpsIndicatorProps {
  satellites: number;
  hdop: number;
  fixType: number;
  lat: number;
  lon: number;
}

export const GpsIndicator: React.FC<GpsIndicatorProps> = ({
  satellites,
  hdop,
  fixType,
  lat,
  lon,
}) => {
  return (
    <div className="flex flex-col space-y-1 font-mono text-xs select-none w-28 sm:w-32">
      <div className="flex justify-between items-center bg-[#11171E] px-2 py-1 rounded border border-[#2B3743]">
        <div className="flex items-center space-x-1 text-[#707C88] text-[9px] font-bold">
          <Satellite className="w-3 h-3 text-[#5B8FB9]" />
          <span>GPS</span>
        </div>
        <span className="font-bold text-[#4F9A72] text-[10px] tabular-nums px-1.5 py-0.2 bg-[#151D26] rounded border border-[#4F9A72]/40">
          {fixType === 3 ? '3D FIX' : fixType === 4 ? 'RTK' : '2D'}
        </span>
      </div>

      <div className="flex justify-between items-center bg-[#151D26] px-2 py-0.5 rounded border border-[#2B3743] text-[10px]">
        <span className="text-[#707C88] text-[9px]">SATS</span>
        <span className="text-[#E7EBEF] tabular-nums font-bold">{satellites} <span className="text-[8px] text-[#707C88]">({hdop.toFixed(1)}H)</span></span>
      </div>

      <div className="text-[9px] text-[#707C88] bg-[#151D26] px-1.5 py-0.5 rounded border border-[#2B3743] truncate tabular-nums">
        {lat.toFixed(4)}°, {lon.toFixed(4)}°
      </div>
    </div>
  );
};
