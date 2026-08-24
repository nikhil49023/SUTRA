import React from 'react';
import { useAIStore } from '../stores/aiStore';
import { wsClient } from '../communication/WebSocketClient';
import { Brain, Check, X, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

export const MissionAdvisor: React.FC = () => {
  const { recommendations, updateRecommendationStatus } = useAIStore();

  const handleDecision = (id: string, accept: boolean) => {
    updateRecommendationStatus(id, accept ? 'ACCEPTED' : 'REJECTED');
    wsClient.sendCommand('AI_DECISION', {
      recommendation_id: id,
      accept,
    });
  };

  const handleRunAnalysis = () => {
    wsClient.sendCommand('AI_RUN_ANALYSIS', {});
  };

  return (
    <div className="bg-[#0f141c]/90 border border-slate-800 rounded-lg p-3 font-mono text-xs space-y-3 select-none">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-1.5 font-bold text-slate-200">
          <Brain className="w-3.5 h-3.5 text-purple-400" />
          <span>AI MISSION ADVISORY & RECOMMENDATIONS</span>
        </div>
        <button
          onClick={handleRunAnalysis}
          className="px-2 py-0.5 rounded bg-purple-950 border border-purple-500/50 text-purple-300 hover:bg-purple-900 text-[10px] font-bold flex items-center space-x-1"
        >
          <RefreshCw className="w-3 h-3" />
          <span>EVALUATE</span>
        </button>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto">
        {recommendations.length === 0 ? (
          <div className="text-center py-4 text-slate-500">
            No active AI advisories. Flight parameters are within nominal envelope.
          </div>
        ) : (
          recommendations.map((rec) => {
            const isEmergency = rec.severity === 'EMERGENCY' || rec.severity === 'CRITICAL';
            const isPending = rec.status === 'PENDING';

            return (
              <div
                key={rec.recommendation_id}
                className={`p-2.5 rounded border space-y-2 transition ${
                  isEmergency
                    ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                    : rec.severity === 'MEDIUM'
                    ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>{rec.title}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.2 rounded border bg-black/50 text-slate-400 tabular-nums">
                    {(rec.confidence * 100).toFixed(0)}% CONF
                  </span>
                </div>

                <div className="text-[11px] text-slate-300">{rec.message}</div>
                <div className="text-[10px] text-slate-400 italic">Reason: {rec.reason}</div>

                {isPending && rec.requires_operator_approval ? (
                  <div className="flex items-center space-x-2 pt-1 border-t border-slate-800">
                    <button
                      onClick={() => handleDecision(rec.recommendation_id, true)}
                      className="flex-1 py-1 rounded bg-emerald-950 border border-emerald-500/50 hover:bg-emerald-900 text-emerald-200 font-bold flex items-center justify-center space-x-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>ACCEPT ACTION</span>
                    </button>
                    <button
                      onClick={() => handleDecision(rec.recommendation_id, false)}
                      className="flex-1 py-1 rounded bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 flex items-center justify-center space-x-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>DISMISS</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 font-bold">
                    STATUS: <span className="text-cyan-400">{rec.status}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
