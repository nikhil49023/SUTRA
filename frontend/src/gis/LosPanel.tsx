import React from 'react';
import { useGISStore } from '../stores/gisStore';
import { wsClient } from '../communication/WebSocketClient';
import { Eye, Play, CheckCircle2, XCircle } from 'lucide-react';

export const LosPanel: React.FC = () => {
  const { los_vectors } = useGISStore();

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
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 sm:p-4 font-mono text-xs space-y-3 select-none">
      <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-[#151D26] border border-[#5B8FB9]/40 flex items-center justify-center">
            <Eye className="w-3.5 h-3.5 text-[#5B8FB9]" />
          </div>
          <div>
            <span className="font-bold text-[#E7EBEF]">3D OPTICAL & RF LINE-OF-SIGHT</span>
            <span className="text-[10px] text-[#707C88] ml-2">// FRESNEL RAYCASTING</span>
          </div>
        </div>
        <button
          onClick={handleRunLos}
          className="px-2.5 py-1 rounded bg-[#151D26] hover:bg-[#1B2530] border border-[#5B8FB9]/50 text-[#5B8FB9] hover:text-[#E7EBEF] text-[10px] font-bold flex items-center space-x-1.5 transition"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>TRACE RAY</span>
        </button>
      </div>

      {vector ? (
        <div className="bg-[#151D26] p-3 rounded-lg border border-[#2B3743] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[#707C88] font-bold">RAY VISIBILITY STATUS:</span>
            <div className={`flex items-center space-x-1.5 font-bold ${vector.visible ? 'text-[#4F9A72]' : 'text-[#C75A5A]'}`}>
              {vector.visible ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              <span>{vector.visible ? 'CLEAR (DIRECT LOS)' : 'BLOCKED / OCCLUDED'}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#2B3743]/60">
            <span className="text-[#707C88]">MIN GROUND CLEARANCE:</span>
            <span className="font-bold text-[#5B8FB9] tabular-nums">{vector.min_clearance.toFixed(1)} meters</span>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-[#707C88] text-[11px] bg-[#151D26] rounded-lg border border-[#2B3743]">
          No active LOS ray calculation. Click "TRACE RAY" to simulate terrain occlusion.
        </div>
      )}
    </div>
  );
};
