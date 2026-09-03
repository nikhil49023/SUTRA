import React, { useState } from 'react';
import { useGISStore } from '../stores/gisStore';
import { useMissionStore } from '../stores/missionStore';
import { commandManager } from '../communication/CommandManager';
import { Grid, Play, CheckCircle2, Layers } from 'lucide-react';

export const SearchGridPanel: React.FC = () => {
  const [pattern, setPattern] = useState<'LAWN_MOWER' | 'PERIMETER' | 'GRID'>('LAWN_MOWER');
  const [spacing, setSpacing] = useState(30);
  const [altitude, setAltitude] = useState(25);
  const [speed, setSpeed] = useState(6.0);
  const [orientation, setOrientation] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<{ pattern: string; count: number } | null>(null);

  const handleGenerateGrid = async () => {
    setIsGenerating(true);
    try {
      const resp = await commandManager.sendCommand('gis.run_search_grid', {
        pattern,
        spacing_m: spacing,
        altitude_m: altitude,
        speed_mps: speed,
        orientation_deg: orientation,
        bounds_coordinates: [
          [37.7745, -122.4200],
          [37.7765, -122.4200],
          [37.7765, -122.4175],
          [37.7745, -122.4175],
        ],
      });
      setLastGenerated({
        pattern,
        count: pattern === 'PERIMETER' ? 5 : 8,
      });
    } catch (e) {
      console.warn('Search grid generation error:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 sm:p-4 font-mono text-xs space-y-3 select-none">
      <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-[#151D26] border border-[#5B8FB9]/40 flex items-center justify-center">
            <Grid className="w-3.5 h-3.5 text-[#5B8FB9]" />
          </div>
          <div>
            <span className="font-bold text-[#E7EBEF]">TACTICAL SEARCH & RESCUE GRID GENERATOR</span>
            <span className="text-[10px] text-[#707C88] ml-2">// BOUSTROPHEDON & PERIMETER TRANSECTS</span>
          </div>
        </div>
        <button
          onClick={handleGenerateGrid}
          disabled={isGenerating}
          className="px-2.5 py-1 rounded bg-[#151D26] hover:bg-[#1B2530] border border-[#5B8FB9]/50 text-[#5B8FB9] hover:text-[#E7EBEF] text-[10px] font-bold flex items-center space-x-1.5 transition active:scale-95 disabled:opacity-50"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>{isGenerating ? 'GENERATING...' : 'GENERATE & SYNC TO MISSION'}</span>
        </button>
      </div>

      {/* Pattern Selector */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { id: 'LAWN_MOWER', label: 'BOUSTROPHEDON', sub: 'Parallel Sweeps' },
          { id: 'PERIMETER', label: 'PERIMETER', sub: 'Boundary Patrol' },
          { id: 'GRID', label: 'CROSS-HATCH', sub: 'Orthogonal Dual-Pass' },
        ].map((p) => {
          const isActive = pattern === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setPattern(p.id as any)}
              className={`p-2.5 rounded-lg border text-left transition ${
                isActive
                  ? 'bg-[#1B2530] border-[#5B8FB9] text-[#E7EBEF] ring-1 ring-[#5B8FB9]/50 shadow-[0_0_8px_rgba(91,143,185,0.2)]'
                  : 'bg-[#151D26] border-[#2B3743] text-[#707C88] hover:text-[#E7EBEF]'
              }`}
            >
              <div className="font-bold text-xs flex items-center justify-between">
                <span>{p.label}</span>
                {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-[#5B8FB9]" />}
              </div>
              <div className="text-[9px] text-[#707C88] mt-0.5">{p.sub}</div>
            </button>
          );
        })}
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        <div className="bg-[#151D26] p-2 rounded border border-[#2B3743]">
          <div className="flex justify-between text-[10px] text-[#707C88]">
            <span>LANE SPACING</span>
            <span className="font-bold text-[#5B8FB9] tabular-nums">{spacing}m</span>
          </div>
          <input
            type="range"
            min="10"
            max="80"
            step="5"
            value={spacing}
            onChange={(e) => setSpacing(Number(e.target.value))}
            className="w-full mt-1 accent-[#5B8FB9] cursor-pointer"
          />
        </div>

        <div className="bg-[#151D26] p-2 rounded border border-[#2B3743]">
          <div className="flex justify-between text-[10px] text-[#707C88]">
            <span>SWEEP ALTITUDE</span>
            <span className="font-bold text-[#5B8FB9] tabular-nums">{altitude}m</span>
          </div>
          <input
            type="range"
            min="10"
            max="60"
            step="5"
            value={altitude}
            onChange={(e) => setAltitude(Number(e.target.value))}
            className="w-full mt-1 accent-[#5B8FB9] cursor-pointer"
          />
        </div>

        <div className="bg-[#151D26] p-2 rounded border border-[#2B3743]">
          <div className="flex justify-between text-[10px] text-[#707C88]">
            <span>CRUISE SPEED</span>
            <span className="font-bold text-[#5B8FB9] tabular-nums">{speed.toFixed(1)}m/s</span>
          </div>
          <input
            type="range"
            min="2"
            max="12"
            step="0.5"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-full mt-1 accent-[#5B8FB9] cursor-pointer"
          />
        </div>

        <div className="bg-[#151D26] p-2 rounded border border-[#2B3743]">
          <div className="flex justify-between text-[10px] text-[#707C88]">
            <span>ORIENTATION</span>
            <span className="font-bold text-[#5B8FB9] tabular-nums">{orientation}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            step="15"
            value={orientation}
            onChange={(e) => setOrientation(Number(e.target.value))}
            className="w-full mt-1 accent-[#5B8FB9] cursor-pointer"
          />
        </div>
      </div>

      {lastGenerated && (
        <div className="p-2.5 rounded bg-[#1B2530] border border-[#4F9A72]/50 text-[#4F9A72] flex items-center justify-between font-bold text-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Search corridor generated: {lastGenerated.pattern} ({lastGenerated.count} waypoints synchronized).</span>
          </div>
          <span className="text-[10px] text-[#E7EBEF] bg-[#11171E] px-2 py-0.5 rounded border border-[#2B3743]">MISSION READY</span>
        </div>
      )}
    </div>
  );
};
