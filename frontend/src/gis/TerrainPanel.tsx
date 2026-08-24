import React from 'react';
import { useGISStore } from '../stores/gisStore';
import { wsClient } from '../communication/WebSocketClient';
import { Mountain, Play, RotateCcw } from 'lucide-react';

export const TerrainPanel: React.FC = () => {
  const { elevation_samples, elevation_enabled, toggleOverlay } = useGISStore();

  const handleRunElevation = () => {
    wsClient.sendCommand('GIS_RUN_ELEVATION', {
      start_point: [37.774929, -122.419416],
      end_point: [37.779, -122.4155],
    });
  };

  const maxElev = elevation_samples.length
    ? Math.max(...elevation_samples.map((s) => s.elev))
    : 40;
  const minElev = elevation_samples.length
    ? Math.min(...elevation_samples.map((s) => s.elev))
    : 0;

  return (
    <div className="bg-[#0f141c]/90 border border-slate-800 rounded-lg p-3 font-mono text-xs space-y-3 select-none">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-1.5 font-bold text-slate-200">
          <Mountain className="w-3.5 h-3.5 text-cyan-400" />
          <span>TERRAIN ELEVATION PROFILE</span>
        </div>
        <button
          onClick={handleRunElevation}
          className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-900 text-[10px] font-bold flex items-center space-x-1"
        >
          <Play className="w-2.5 h-2.5" />
          <span>ANALYZE</span>
        </button>
      </div>

      {/* Cross-sectional chart preview */}
      <div className="bg-slate-950 p-2 rounded border border-slate-800 h-32 flex flex-col justify-end">
        <div className="flex items-end space-x-1 h-24 w-full">
          {elevation_samples.map((sample, idx) => {
            const heightPct = ((sample.elev - minElev) / (maxElev - minElev || 1)) * 80 + 20;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center group relative">
                <div
                  className="w-full bg-cyan-500/80 rounded-t group-hover:bg-cyan-400 transition-all"
                  style={{ height: `${heightPct}%` }}
                />
                <span className="text-[8px] text-slate-500 mt-1 tabular-nums">
                  {sample.dist}m
                </span>
                {/* Tooltip */}
                <div className="absolute -top-6 hidden group-hover:block bg-black/90 px-1 py-0.5 rounded border border-cyan-400 text-[9px] text-cyan-300 pointer-events-none z-10 whitespace-nowrap">
                  {sample.elev.toFixed(1)}m
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between text-[10px] text-slate-400 px-1">
        <span>MIN ELEV: {minElev.toFixed(1)}m</span>
        <span>MAX ELEV: {maxElev.toFixed(1)}m</span>
        <span>SAMPLES: {elevation_samples.length}</span>
      </div>
    </div>
  );
};
