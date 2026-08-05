import React, { useState } from 'react';
import { Video, Crosshair, Target, ShieldAlert, Circle, Eye } from 'lucide-react';

interface CameraHUDProps {
  isRecording?: boolean;
  fps?: number;
  latencyMs?: number;
  zoomLevel?: number;
  gimbalPitch?: number;
  gimbalYaw?: number;
}

export const CameraHUD: React.FC<CameraHUDProps> = ({
  isRecording = true,
  fps = 60,
  latencyMs = 18,
  zoomLevel = 4.0,
  gimbalPitch = -45,
  gimbalYaw = 12
}) => {
  const [isLocked, setIsLocked] = useState(true);

  return (
    <div className="relative w-full h-full bg-[#03060d] border border-[#1b253b] rounded-xl overflow-hidden font-mono select-none flex flex-col justify-between p-4">
      {/* 1. TOP VIDEO METRICS OVERLAY */}
      <div className="flex justify-between items-center z-20">
        <div className="flex items-center space-x-2 bg-[#060b14]/90 border border-[#1b253b] px-3 py-1 rounded backdrop-blur-md text-xs">
          <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-slate-500'}`} />
          <span className="font-bold text-white uppercase">{isRecording ? 'REC 00:12:45' : 'STANDBY'}</span>
          <span className="text-slate-600">|</span>
          <span className="text-cyan-400">4K EO/IR</span>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-400 font-bold">{fps} FPS</span>
          <span className="text-slate-600">|</span>
          <span className="text-amber-400">{latencyMs} ms</span>
        </div>

        <div className="flex items-center space-x-2 bg-[#060b14]/90 border border-[#1b253b] px-3 py-1 rounded backdrop-blur-md text-xs">
          <span className="text-slate-400">GIMBAL:</span>
          <span className="text-cyan-300 font-bold">P {gimbalPitch}°</span>
          <span className="text-cyan-300 font-bold">Y {gimbalYaw}°</span>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-400 font-bold">ZOOM {zoomLevel}x</span>
        </div>
      </div>

      {/* 2. CENTER TARGET LOCKING RETICLE */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="relative flex items-center justify-center">
          {/* Target Bounding Box */}
          <div className={`w-40 h-40 border-2 transition-all duration-300 flex items-center justify-center ${
            isLocked ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'border-cyan-400/60'
          }`}>
            <Crosshair className={`w-8 h-8 ${isLocked ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`} />
          </div>

          {/* Corner L-Brackets */}
          <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400"></div>
          <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400"></div>
          <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-400"></div>
          <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-400"></div>

          {/* Target Label */}
          <div className="absolute top-[-24px] bg-red-950/90 border border-red-800 text-red-300 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase">
            TARGET LOCK: TGT-101 (CONF 98.4%)
          </div>
        </div>
      </div>

      {/* 3. BOTTOM GIMBAL & LASER RANGE READOUT */}
      <div className="flex justify-between items-center z-20">
        <div className="bg-[#060b14]/90 border border-[#1b253b] px-3 py-1 rounded text-xs flex items-center space-x-3 text-slate-300">
          <div><span className="text-slate-500 block text-[9px]">LASER RANGE</span><span className="text-cyan-400 font-bold">1,420 m</span></div>
          <div><span className="text-slate-500 block text-[9px]">TARGET COORD</span><span className="text-white font-mono">45.1092 N, 34.5241 E</span></div>
        </div>

        <button
          onClick={() => setIsLocked(!isLocked)}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all pointer-events-auto flex items-center space-x-1.5 ${
            isLocked ? 'bg-red-600 text-white border-red-400 shadow-lg shadow-red-600/30' : 'bg-cyan-600 text-white border-cyan-400'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>{isLocked ? 'TARGET LOCKED' : 'LOCK TARGET'}</span>
        </button>
      </div>
    </div>
  );
};
