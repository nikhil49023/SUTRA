import React, { useState } from 'react';
import { useGISStore } from '../stores/gisStore';
import { commandManager } from '../communication/CommandManager';
import { TrendingUp, Play, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const SlopePanel: React.FC = () => {
  const [analyzing, setAnalyzing] = useState(false);
  const [slopeResult, setSlopeResult] = useState<{
    avg_slope_deg: number;
    max_slope_deg: number;
    category: string;
    steepest_point: { lat: number; lon: number; elev: number };
  } | null>({
    avg_slope_deg: 4.8,
    max_slope_deg: 12.3,
    category: 'MODERATE',
    steepest_point: { lat: 37.7765, lon: -122.4178, elev: 28.4 },
  });

  const handleRunSlope = async () => {
    setAnalyzing(true);
    try {
      const resp = await commandManager.sendCommandAsync('gis.run_slope', {
        start_point: [37.774929, -122.419416],
        end_point: [37.779, -122.4155],
      });
      if (resp && resp.result) {
        setSlopeResult(resp.result);
      }
    } catch (e) {
      console.warn('Slope calculation fallback:', e);
    } finally {
      setAnalyzing(false);
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat?.toUpperCase()) {
      case 'LOW':
      case 'FLAT':
        return 'text-[#4F9A72] border-[#4F9A72]/40 bg-[#4F9A72]/10';
      case 'MODERATE':
        return 'text-[#C49A4A] border-[#C49A4A]/40 bg-[#C49A4A]/10';
      case 'HIGH':
      case 'STEEP':
      case 'VERY_HIGH':
      case 'CLIFF':
        return 'text-[#C75A5A] border-[#C75A5A]/40 bg-[#C75A5A]/10';
      default:
        return 'text-[#5B8FB9] border-[#5B8FB9]/40 bg-[#5B8FB9]/10';
    }
  };

  return (
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 sm:p-4 font-mono text-xs space-y-3 select-none">
      <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-[#151D26] border border-[#5B8FB9]/40 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-[#5B8FB9]" />
          </div>
          <div>
            <span className="font-bold text-[#E7EBEF]">TERRAIN SLOPE & INCLINE ANALYZER</span>
            <span className="text-[10px] text-[#707C88] ml-2">// SURFACE GRADIENT & LANDING ZONES</span>
          </div>
        </div>
        <button
          onClick={handleRunSlope}
          disabled={analyzing}
          className="px-2.5 py-1 rounded bg-[#151D26] hover:bg-[#1B2530] border border-[#5B8FB9]/50 text-[#5B8FB9] hover:text-[#E7EBEF] text-[10px] font-bold flex items-center space-x-1.5 transition active:scale-95 disabled:opacity-50"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>{analyzing ? 'COMPUTING...' : 'ANALYZE SLOPE'}</span>
        </button>
      </div>

      {slopeResult && (
        <div className="space-y-3">
          {/* Classification Banner */}
          <div className="flex items-center justify-between bg-[#151D26] p-3 rounded-lg border border-[#2B3743]">
            <div className="space-y-0.5">
              <span className="text-[10px] text-[#707C88]">TERRAIN CLASSIFICATION</span>
              <div className="text-sm font-bold text-[#E7EBEF]">{slopeResult.category} INCLINE</div>
            </div>
            <div className={`px-3 py-1 rounded border text-xs font-bold ${getCategoryColor(slopeResult.category)}`}>
              {slopeResult.category === 'LOW' || slopeResult.category === 'MODERATE' ? (
                <div className="flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>SUITABLE FOR UAV LANDING</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>HIGH ROLL RISK — AVOID LANDING</span>
                </div>
              )}
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div className="bg-[#151D26] p-2.5 rounded border border-[#2B3743]">
              <span className="text-[#707C88] block">AVERAGE GRADIENT</span>
              <span className="font-bold text-[#5B8FB9] text-xs mt-0.5 tabular-nums">
                {slopeResult.avg_slope_deg.toFixed(1)}° ({((Math.tan((slopeResult.avg_slope_deg * Math.PI) / 180)) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="bg-[#151D26] p-2.5 rounded border border-[#2B3743]">
              <span className="text-[#707C88] block">MAX PEAK SLOPE</span>
              <span className="font-bold text-[#C49A4A] text-xs mt-0.5 tabular-nums">
                {slopeResult.max_slope_deg.toFixed(1)}° ({((Math.tan((slopeResult.max_slope_deg * Math.PI) / 180)) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="bg-[#151D26] p-2.5 rounded border border-[#2B3743]">
              <span className="text-[#707C88] block">STEEPEST ELEVATION</span>
              <span className="font-bold text-[#E7EBEF] text-xs mt-0.5 tabular-nums">
                {slopeResult.steepest_point?.elev?.toFixed(1) || '0.0'} m AGL
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
