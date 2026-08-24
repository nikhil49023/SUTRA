import React from 'react';
import { useGISStore } from '../stores/gisStore';
import { Ruler, Trash2 } from 'lucide-react';

export const MeasurementPanel: React.FC = () => {
  const { measurement_enabled, toggleOverlay, clearAnalysis } = useGISStore();

  return (
    <div className="bg-[#0f141c]/90 border border-slate-800 rounded-lg p-3 font-mono text-xs space-y-3 select-none">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-1.5 font-bold text-slate-200">
          <Ruler className="w-3.5 h-3.5 text-cyan-400" />
          <span>SPATIAL MEASUREMENT TOOLS</span>
        </div>
        <button
          onClick={clearAnalysis}
          className="p-1 text-slate-400 hover:text-rose-400"
          title="Clear Measurements"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 text-[11px] space-y-1">
        <div className="text-slate-400">Click map points to measure Euclidean distance & bearing.</div>
      </div>
    </div>
  );
};
