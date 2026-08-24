import React from 'react';
import { useAIStore } from '../stores/aiStore';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { formatDistance } from '../utils/formatting';

export const ThreatPanel: React.FC = () => {
  const { threats } = useAIStore();

  return (
    <div className="bg-[#0f141c]/90 border border-slate-800 rounded-lg p-3 font-mono text-xs space-y-3 select-none">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-1.5 font-bold text-slate-200">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>TACTICAL THREAT MATRIX ({threats.length})</span>
        </div>
      </div>

      <div className="space-y-2">
        {threats.length === 0 ? (
          <div className="text-center py-4 text-slate-500">No airspace hazards or threats detected.</div>
        ) : (
          threats.map((threat) => (
            <div
              key={threat.threat_id}
              className="p-2.5 rounded border border-amber-500/40 bg-amber-950/30 text-amber-200 flex items-center justify-between"
            >
              <div>
                <div className="font-bold flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>{threat.label}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                  DIST: {formatDistance(threat.distance_m)} · ALT: {threat.altitude_m}m · SRC: {threat.source}
                </div>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/60 border border-amber-500/40 text-amber-400 font-bold">
                {(threat.confidence * 100).toFixed(0)}%
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
