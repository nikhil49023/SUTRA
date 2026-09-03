import React, { useState } from 'react';
import { useGISStore } from '../stores/gisStore';
import { commandManager } from '../communication/CommandManager';
import { Mountain, Play, Layers } from 'lucide-react';

export const TerrainPanel: React.FC = () => {
  const { elevation_samples, setElevationSamples } = useGISStore();
  const [source, setSource] = useState('DEM_SRTM');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleRunElevation = async () => {
    setIsAnalyzing(true);
    try {
      const resp = await commandManager.sendCommandAsync('gis.run_elevation', {
        start_point: [37.774929, -122.419416],
        end_point: [37.779, -122.4155],
        source,
      });
      const samples = resp?.result?.samples || (Array.isArray(resp?.result) ? resp.result : null);
      if (samples && Array.isArray(samples)) {
        setElevationSamples(
          samples.map((s: any) => ({
            dist: s.distance_along_m ?? s.dist ?? 0,
            elev: s.elevation_m ?? s.elev ?? 0,
            lat: s.latitude ?? s.lat ?? 0,
            lon: s.longitude ?? s.lon ?? 0,
          }))
        );
      }
    } catch (e) {
      console.warn('Elevation run error:', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const maxElev = elevation_samples.length
    ? Math.max(...elevation_samples.map((s) => s.elev))
    : 40;
  const minElev = elevation_samples.length
    ? Math.min(...elevation_samples.map((s) => s.elev))
    : 0;

  return (
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 sm:p-4 font-mono text-xs space-y-3 select-none">
      <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-[#151D26] border border-[#5B8FB9]/40 flex items-center justify-center">
            <Mountain className="w-3.5 h-3.5 text-[#5B8FB9]" />
          </div>
          <div>
            <span className="font-bold text-[#E7EBEF]">TERRAIN ELEVATION PROFILE</span>
            <span className="text-[10px] text-[#707C88] ml-2">// TOPOGRAPHIC CROSS-SECTION</span>
          </div>
        </div>
        <button
          onClick={handleRunElevation}
          className="px-2.5 py-1 rounded bg-[#151D26] hover:bg-[#1B2530] border border-[#5B8FB9]/50 text-[#5B8FB9] hover:text-[#E7EBEF] text-[10px] font-bold flex items-center space-x-1.5 transition"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>ANALYZE</span>
        </button>
      </div>

      {/* Cross-sectional chart preview */}
      <div className="bg-[#151D26] p-3 rounded-lg border border-[#2B3743] h-40 flex flex-col justify-end">
        <div className="flex items-end space-x-1.5 h-28 w-full">
          {elevation_samples.map((sample, idx) => {
            const heightPct = ((sample.elev - minElev) / (maxElev - minElev || 1)) * 75 + 25;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                <div
                  className="w-full bg-[#5B8FB9]/80 rounded-t group-hover:bg-[#5B8FB9] transition-all shadow-[0_0_8px_rgba(91,143,185,0.3)]"
                  style={{ height: `${heightPct}%` }}
                />
                <span className="text-[8px] text-[#707C88] mt-1 tabular-nums">
                  {sample.dist}m
                </span>
                {/* Tooltip */}
                <div className="absolute -top-7 hidden group-hover:block bg-[#0B0F14] px-1.5 py-0.5 rounded border border-[#5B8FB9] text-[9px] font-bold text-[#E7EBEF] pointer-events-none z-10 whitespace-nowrap shadow-lg">
                  {sample.elev.toFixed(1)}m AGL
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Metrics */}
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <div className="bg-[#151D26] p-2 rounded border border-[#2B3743]">
          <span className="text-[#707C88] block">MIN ELEVATION</span>
          <span className="font-bold text-[#E7EBEF] text-xs mt-0.5 tabular-nums">{minElev.toFixed(1)} m</span>
        </div>
        <div className="bg-[#151D26] p-2 rounded border border-[#2B3743]">
          <span className="text-[#707C88] block">MAX ELEVATION</span>
          <span className="font-bold text-[#C49A4A] text-xs mt-0.5 tabular-nums">{maxElev.toFixed(1)} m</span>
        </div>
        <div className="bg-[#151D26] p-2 rounded border border-[#2B3743]">
          <span className="text-[#707C88] block">SAMPLES RESOLUTION</span>
          <span className="font-bold text-[#5B8FB9] text-xs mt-0.5 tabular-nums">{elevation_samples.length} points</span>
        </div>
      </div>
    </div>
  );
};
