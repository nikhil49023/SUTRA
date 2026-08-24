import React from 'react';
import { useGISStore } from '../stores/gisStore';
import { wsClient } from '../communication/WebSocketClient';
import { Eye, Play, CheckCircle2, XCircle } from 'lucide-react';

export const LosPanel: React.FC = () => {
  const { los_vectors, los_enabled, toggleOverlay } = useGISStore();

  const handleRunLos = () => {
    wsClient.sendCommand('GIS_RUN_LOS', {
      obs_point: [37.774929, -122.419416],
      obs_alt: 25.0,
      target_point: [37.778, -122.4165],
      target_alt: 35.0,
    });
  };

  const vector = los_vectors[0];

  return (
    <div className="bg-[#0f141c]/90 border border-slate-800 rounded-lg p-3 font-mono text-xs space-y-3 select-none">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-1.5 font-bold text-slate-200">
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span>3D OPTICAL & RF LINE-OF-SIGHT</span>
        </div>
        <button
          onClick={handleRunLos}
          className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-900 text-[10px] font-bold flex items-center space-x-1"
        >
          <Play className="w-2.5 h-2.5" />
          <span>TRACE RAY</span>
        </button>
      </div>

      {vector ? (
        <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">RAY VISIBILITY:</span>
            <div className={`flex items-center space-x-1 font-bold ${vector.visible ? 'text-emerald-400' : 'text-rose-400'}`}>
              {vector.visible ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              <span>{vector.visible ? 'CLEAR (DIRECT LOS)' : 'BLOCKED / OCCLUDED'}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">MIN GROUND CLEARANCE:</span>
            <span className="font-bold text-cyan-300 tabular-nums">{vector.min_clearance.toFixed(1)} meters</span>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-slate-500 text-[11px]">
          No active LOS ray. Click "TRACE RAY" to calculate.
        </div>
      )}
    </div>
  );
};
