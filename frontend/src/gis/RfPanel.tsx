import React from 'react';
import { useGISStore } from '../stores/gisStore';
import { wsClient } from '../communication/WebSocketClient';
import { Radio, Play } from 'lucide-react';

export const RfPanel: React.FC = () => {
  const { rf_enabled, toggleOverlay } = useGISStore();

  const handleRunRf = () => {
    wsClient.sendCommand('GIS_RUN_RF', {
      center_point: [37.774929, -122.419416],
      radius_m: 2500,
    });
  };

  return (
    <div className="bg-[#0f141c]/90 border border-slate-800 rounded-lg p-3 font-mono text-xs space-y-3 select-none">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-1.5 font-bold text-slate-200">
          <Radio className="w-3.5 h-3.5 text-cyan-400" />
          <span>RF MESH PROPAGATION HEATMAP</span>
        </div>
        <button
          onClick={handleRunRf}
          className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-900 text-[10px] font-bold flex items-center space-x-1"
        >
          <Play className="w-2.5 h-2.5" />
          <span>COMPUTE</span>
        </button>
      </div>

      <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 space-y-2 text-[11px]">
        <div className="flex justify-between">
          <span className="text-slate-400">FREQUENCY:</span>
          <span className="font-bold text-slate-200">2.4 GHz ISM / 915 MHz</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">FREE-SPACE PATH LOSS:</span>
          <span className="font-bold text-emerald-400 tabular-nums">-74 dBm @ 1.2km</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">SWARM-RAFT MESH SNR:</span>
          <span className="font-bold text-cyan-300 tabular-nums">+18.5 dB (EXCELLENT)</span>
        </div>
      </div>
    </div>
  );
};
