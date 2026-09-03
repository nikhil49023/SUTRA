import React from 'react';
import { useGISStore } from '../stores/gisStore';
import { Ruler, Trash2 } from 'lucide-react';

export const MeasurementPanel: React.FC = () => {
  const { clearAnalysis } = useGISStore();

  return (
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 sm:p-4 font-mono text-xs space-y-3 select-none">
      <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-[#151D26] border border-[#5B8FB9]/40 flex items-center justify-center">
            <Ruler className="w-3.5 h-3.5 text-[#5B8FB9]" />
          </div>
          <div>
            <span className="font-bold text-[#E7EBEF]">SPATIAL MEASUREMENT TOOLS</span>
            <span className="text-[10px] text-[#707C88] ml-2">// GEODESIC DISTANCE & BEARING</span>
          </div>
        </div>
        <button
          onClick={clearAnalysis}
          className="p-1 text-[#707C88] hover:text-[#C75A5A] hover:bg-[#151D26] rounded transition"
          title="Clear Measurements"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="bg-[#151D26] p-3 rounded-lg border border-[#2B3743] text-[11px] space-y-1.5">
        <div className="text-[#E7EBEF] font-bold">Interactive Geodesic Caliper:</div>
        <div className="text-[#707C88]">Click any two points on the tactical map to compute Euclidean distance, WGS-84 geodesic arc, true magnetic bearing, and elevation delta.</div>
      </div>
    </div>
  );
};
