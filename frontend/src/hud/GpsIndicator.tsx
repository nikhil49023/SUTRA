import React from 'react';
import { Satellite, Navigation2 } from 'lucide-react';

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
    <div className="flex flex-col space-y-1 font-mono text-xs select-none">
      <div className="flex justify-between items-center bg-[#11171E] px-2 py-1 rounded border border-[#2B3743]">
        <div className="flex items-center space-x-1.5">
          <Satellite className="w-3.5 h-3.5 text-[#5B8FB9]" />
          <span className="text-[10px] text-[#707C88]">GPS FIX</span>
        </div>
        <span className="font-bold text-[#4F9A72] tabular-nums">
          {fixType === 3 ? '3D FIX' : fixType === 4 ? 'RTK' : '2D'}
        </span>
      </div>

      <div className="flex justify-between items-center bg-[#151D26] px-2 py-0.5 rounded border border-[#2B3743] text-[11px]">
        <span className="text-[#707C88]">SATS / HDOP</span>
        <span className="text-[#E7EBEF] tabular-nums">{satellites} SAT ({hdop.toFixed(1)})</span>
      </div>

      <div className="text-[10px] text-[#A9B3BD] px-1 truncate tabular-nums">
        {lat.toFixed(5)}°, {lon.toFixed(5)}°
      </div>
    </div>
  );
};
