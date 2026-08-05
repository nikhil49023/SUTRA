import React from 'react';
import { Layers } from 'lucide-react';
import type { MapStyleMode } from './MapStyles';

interface LayerControllerProps {
  mapStyle: MapStyleMode;
  onSelectStyle: (style: MapStyleMode) => void;
  showWaypoints: boolean;
  onToggleWaypoints: (val: boolean) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const LayerController: React.FC<LayerControllerProps> = ({
  mapStyle,
  onSelectStyle,
  showWaypoints,
  onToggleWaypoints,
  isOpen,
  onToggleOpen
}) => {
  return (
    <div className="relative pointer-events-auto">
      <button
        onClick={onToggleOpen}
        className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#090e18]/95 border border-[#1a2336] text-slate-300 hover:text-cyan-400 text-xs font-mono backdrop-blur-md shadow-lg"
      >
        <Layers className="w-3.5 h-3.5 text-cyan-400" />
        <span>LAYERS</span>
      </button>

      {isOpen && (
        <div className="absolute top-9 right-0 w-56 bg-[#090e18]/95 border border-[#1a2336] backdrop-blur-md p-3 rounded-lg shadow-2xl space-y-2 text-xs font-mono z-50">
          <div className="text-slate-400 font-bold uppercase border-b border-[#1a2336] pb-1 text-[10px]">
            MAP BASE TILES
          </div>
          {(['TACTICAL_DARK', 'SATELLITE', 'TERRAIN', 'STREETS'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                onSelectStyle(mode);
                onToggleOpen();
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded transition-colors ${
                mapStyle === mode
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-300 hover:bg-[#131b2b]'
              }`}
            >
              {mode.replace('_', ' ')}
            </button>
          ))}

          <div className="text-slate-400 font-bold uppercase border-b border-[#1a2336] pt-1 pb-1 text-[10px]">
            OVERLAY LAYERS
          </div>
          <label className="flex items-center space-x-2 text-slate-300 cursor-pointer hover:text-cyan-400">
            <input
              type="checkbox"
              checked={showWaypoints}
              onChange={(e) => onToggleWaypoints(e.target.checked)}
              className="rounded accent-cyan-500"
            />
            <span>Waypoints Layer</span>
          </label>
        </div>
      )}
    </div>
  );
};
