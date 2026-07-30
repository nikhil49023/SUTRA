import React from 'react';
import { ZoomIn, ZoomOut, Compass, Navigation2, Maximize } from 'lucide-react';

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetBearing: () => void;
  onTogglePitch: () => void;
  is3D: boolean;
  followDrone: boolean;
  onToggleFollowDrone: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onResetBearing,
  onTogglePitch,
  is3D,
  followDrone,
  onToggleFollowDrone
}) => {
  return (
    <div className="absolute bottom-6 right-6 flex flex-col space-y-1.5 z-20 pointer-events-auto">
      <button
        onClick={onToggleFollowDrone}
        className={`p-2 rounded-lg border backdrop-blur-md transition-all shadow-xl font-mono text-xs flex items-center space-x-1.5 ${
          followDrone
            ? 'bg-cyan-500/30 border-cyan-400 text-cyan-300 shadow-[0_0_12px_#00f0ff44]'
            : 'bg-[#090e18]/90 border-[#1a2336] text-slate-400 hover:text-slate-200'
        }`}
        title="Follow Drone Auto-Centering"
      >
        <Navigation2 className={`w-4 h-4 ${followDrone ? 'animate-pulse text-cyan-400' : ''}`} />
        <span className="hidden sm:inline font-bold">FOLLOW DRONE</span>
      </button>

      <button
        onClick={onZoomIn}
        className="p-2 bg-[#090e18]/90 border border-[#1a2336] hover:border-cyan-500/50 rounded-lg text-slate-300 hover:text-cyan-400 transition-all shadow-lg"
        title="Zoom In"
      >
        <ZoomIn className="w-4 h-4" />
      </button>

      <button
        onClick={onZoomOut}
        className="p-2 bg-[#090e18]/90 border border-[#1a2336] hover:border-cyan-500/50 rounded-lg text-slate-300 hover:text-cyan-400 transition-all shadow-lg"
        title="Zoom Out"
      >
        <ZoomOut className="w-4 h-4" />
      </button>

      <button
        onClick={onTogglePitch}
        className={`p-2 rounded-lg border transition-all shadow-lg text-xs font-mono font-bold ${
          is3D
            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
            : 'bg-[#090e18]/90 border-[#1a2336] text-slate-400 hover:text-slate-200'
        }`}
        title="Toggle 3D Pitch View"
      >
        3D
      </button>

      <button
        onClick={onResetBearing}
        className="p-2 bg-[#090e18]/90 border border-[#1a2336] hover:border-cyan-500/50 rounded-lg text-slate-300 hover:text-cyan-400 transition-all shadow-lg"
        title="Reset North Orientation"
      >
        <Compass className="w-4 h-4" />
      </button>
    </div>
  );
};
