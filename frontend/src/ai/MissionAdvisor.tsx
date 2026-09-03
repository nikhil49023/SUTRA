import React, { useState } from 'react';
import { useAIStore } from '../stores/aiStore';
import { commandManager } from '../communication/CommandManager';
import { Brain, Check, X, Sparkles, RefreshCw } from 'lucide-react';

export const MissionAdvisor: React.FC = () => {
  const { recommendations, updateRecommendationStatus } = useAIStore();
  const [isEvaluating, setIsEvaluating] = useState(false);

  const handleDecision = async (id: string, accept: boolean) => {
    updateRecommendationStatus(id, accept ? 'ACCEPTED' : 'REJECTED');
    try {
      await commandManager.sendCommandAsync('ai.decision', {
        recommendation_id: id,
        accept,
      });
    } catch (e) {
      console.warn('AI Decision send error:', e);
    }
  };

  const handleRunAnalysis = async () => {
    setIsEvaluating(true);
    try {
      await commandManager.sendCommandAsync('ai.run_analysis', {});
    } catch (e) {
      console.warn('AI Run Analysis error:', e);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 sm:p-4 font-mono text-xs space-y-3 select-none">
      <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-[#151D26] border border-[#5B8FB9]/40 flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-[#5B8FB9]" />
          </div>
          <div>
            <span className="font-bold text-[#E7EBEF]">AI MISSION ADVISORY & RECOMMENDATIONS</span>
            <span className="text-[10px] text-[#707C88] ml-2">// REAL-TIME HEURISTICS</span>
          </div>
        </div>
        <button
          onClick={handleRunAnalysis}
          className="px-2.5 py-1 rounded bg-[#151D26] hover:bg-[#1B2530] border border-[#5B8FB9]/50 text-[#5B8FB9] hover:text-[#E7EBEF] text-[10px] font-bold flex items-center space-x-1.5 transition"
        >
          <RefreshCw className="w-3 h-3" />
          <span>EVALUATE</span>
        </button>
      </div>

      <div className="space-y-2.5 max-h-80 overflow-y-auto custom-scrollbar pr-0.5">
        {recommendations.length === 0 ? (
          <div className="text-center py-6 text-[#707C88] text-[11px] bg-[#151D26] rounded-lg border border-[#2B3743]">
            No active AI advisories. Flight parameters and sensor limits are within nominal safety envelope.
          </div>
        ) : (
          recommendations.map((rec) => {
            const isEmergency = rec.severity === 'EMERGENCY' || rec.severity === 'CRITICAL';
            const isPending = rec.status === 'PENDING';

            return (
              <div
                key={rec.recommendation_id}
                className={`p-3 rounded-lg border space-y-2 transition ${
                  isEmergency
                    ? 'bg-[#151D26] border-[#C75A5A]/60 text-[#E7EBEF]'
                    : rec.severity === 'MEDIUM'
                    ? 'bg-[#151D26] border-[#C49A4A]/60 text-[#E7EBEF]'
                    : 'bg-[#151D26] border-[#2B3743] text-[#A9B3BD]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 font-bold text-[#E7EBEF]">
                    <Sparkles className="w-3.5 h-3.5 text-[#5B8FB9]" />
                    <span>{rec.title}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.2 rounded bg-[#0B0F14] border border-[#2B3743] text-[#A9B3BD] tabular-nums font-bold">
                    {(rec.confidence * 100).toFixed(0)}% CONF
                  </span>
                </div>

                <div className="text-[11px] text-[#E7EBEF]">{rec.message}</div>
                <div className="text-[10px] text-[#707C88] italic">Reason: {rec.reason}</div>

                {isPending && rec.requires_operator_approval ? (
                  <div className="flex items-center space-x-2 pt-2 border-t border-[#2B3743]/60">
                    <button
                      onClick={() => handleDecision(rec.recommendation_id, true)}
                      className="flex-1 py-1.5 rounded bg-[#4F9A72] hover:bg-[#438361] text-white font-bold text-[11px] flex items-center justify-center space-x-1.5 transition active:scale-95 shadow-[0_0_8px_rgba(79,154,114,0.3)]"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>ACCEPT ACTION</span>
                    </button>
                    <button
                      onClick={() => handleDecision(rec.recommendation_id, false)}
                      className="flex-1 py-1.5 rounded bg-[#151D26] hover:bg-[#1B2530] border border-[#2B3743] text-[#A9B3BD] hover:text-[#E7EBEF] text-[11px] font-bold flex items-center justify-center space-x-1.5 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>DISMISS</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-[10px] text-[#707C88] font-bold pt-1 border-t border-[#2B3743]/60">
                    STATUS: <span className="text-[#5B8FB9]">{rec.status}</span>
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
