import React from 'react';
import { useGISStore } from '../stores/gisStore';
import { wsClient } from '../communication/WebSocketClient';
import { Radio, Play } from 'lucide-react';

export const RfPanel: React.FC = () => {
  const { rf_enabled } = useGISStore();

  const handleRunRf = () => {
    wsClient.sendCommand('GIS_RUN_RF', {
      center_point: [37.774929, -122.419416],
      radius_m: 2500,
    });
  };

  return (
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 sm:p-4 font-mono text-xs space-y-3 select-none">
      <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-[#151D26] border border-[#5B8FB9]/40 flex items-center justify-center">
            <Radio className="w-3.5 h-3.5 text-[#5B8FB9]" />
          </div>
          <div>
            <span className="font-bold text-[#E7EBEF]">RF MESH PROPAGATION HEATMAP</span>
            <span className="text-[10px] text-[#707C88] ml-2">// SWARM-RAFT LINK BUDGET</span>
          </div>
        </div>
        <button
          onClick={handleRunRf}
          className="px-2.5 py-1 rounded bg-[#151D26] hover:bg-[#1B2530] border border-[#5B8FB9]/50 text-[#5B8FB9] hover:text-[#E7EBEF] text-[10px] font-bold flex items-center space-x-1.5 transition"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>COMPUTE</span>
        </button>
      </div>

      <div className="bg-[#151D26] p-3 rounded-lg border border-[#2B3743] space-y-2.5 text-[11px]">
        <div className="flex justify-between items-center">
          <span className="text-[#707C88] font-bold">OPERATING FREQUENCY:</span>
          <span className="font-bold text-[#E7EBEF] bg-[#11171E] px-2 py-0.5 rounded border border-[#2B3743]">2.4 GHz ISM / 915 MHz</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[#707C88] font-bold">FREE-SPACE PATH LOSS (FSPL):</span>
          <span className="font-bold text-[#4F9A72] tabular-nums">-74.2 dBm @ 1.2km</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[#707C88] font-bold">SWARM-RAFT MESH SNR:</span>
          <span className="font-bold text-[#5B8FB9] tabular-nums">+18.5 dB (EXCELLENT)</span>
        </div>
        <div className="flex justify-between items-center pt-1 border-t border-[#2B3743]/60">
          <span className="text-[#707C88] font-bold">PACKET DELIVERY RATIO:</span>
          <span className="font-bold text-[#4F9A72] tabular-nums">99.8% (MESH LAYER 2)</span>
        </div>
      </div>
    </div>
  );
};
