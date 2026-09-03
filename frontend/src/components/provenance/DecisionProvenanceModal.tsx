import React, { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useDefensiveUpgradesStore, DecisionRecord } from '../../stores/defensiveUpgradesStore';
import {
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  X,
  AlertTriangle,
  Brain,
  Layers,
  HelpCircle,
} from 'lucide-react';

export const DecisionProvenanceModal: React.FC = () => {
  const provenanceOpen = useAppStore((s) => s.provenanceOpen);
  const setProvenanceOpen = useAppStore((s) => s.setProvenanceOpen);

  const provenanceRecords = useDefensiveUpgradesStore((s) => s.provenanceRecords);
  const [selectedRecordId, setSelectedRecordId] = useState<string>(
    provenanceRecords[0]?.record_id || 'dec-prov-01'
  );

  if (!provenanceOpen) return null;

  const currentRecord =
    provenanceRecords.find((r) => r.record_id === selectedRecordId) || provenanceRecords[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none font-mono">
      <div className="w-full max-w-4xl bg-[#0B0F14] border border-[#2B3743] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#11171E] border-b border-[#2B3743] px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded bg-[#8B5CF6]/20 border border-[#8B5CF6]/60 flex items-center justify-center text-[#8B5CF6]">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm text-[#E7EBEF] tracking-wide">
                  EVIDENCE & DECISION PROVENANCE LAYER (EXPLAINABLE AUTONOMY)
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#8B5CF6]">
                  PRIORITY 6
                </span>
              </div>
              <span className="text-[10px] text-[#707C88]">
                &quot;WHY DID SUTRA DO THIS?&quot; — Complete mathematical, sensory, and risk justification
              </span>
            </div>
          </div>
          <button
            onClick={() => setProvenanceOpen(false)}
            className="p-1 rounded text-[#707C88] hover:text-[#E7EBEF] hover:bg-[#151D26] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar flex-1 flex flex-col">
          {/* Record Selector Tabs */}
          <div className="flex space-x-2 overflow-x-auto pb-1">
            {provenanceRecords.map((rec) => (
              <button
                key={rec.record_id}
                onClick={() => setSelectedRecordId(rec.record_id)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold whitespace-nowrap transition flex items-center space-x-2 ${
                  selectedRecordId === rec.record_id
                    ? 'bg-[#1B2530] border-[#8B5CF6] text-[#E7EBEF] shadow-[0_0_10px_rgba(139,92,246,0.3)]'
                    : 'bg-[#11171E] border-[#2B3743] text-[#707C88] hover:text-[#E7EBEF]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
                <span>{rec.timestamp_ist}</span>
                <span className="text-[10px] text-[#A9B3BD]">[{rec.drone_id}]</span>
              </button>
            ))}
          </div>

          {currentRecord && (
            <div className="space-y-3.5 flex-1">
              {/* Core Question & Decision Banner */}
              <div className="bg-[#151D26] border border-[#8B5CF6]/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#8B5CF6] font-extrabold flex items-center space-x-1.5">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>WHY DID SUTRA DO THIS?</span>
                  </span>
                  <span className="text-xs text-[#707C88] font-bold">
                    TIMESTAMP: <span className="text-[#E7EBEF]">{currentRecord.timestamp_ist}</span>
                  </span>
                </div>

                <div className="text-sm font-extrabold text-[#E7EBEF]">
                  DECISION: <span className="text-[#5B8FB9]">{currentRecord.decision}</span>
                </div>
                <div className="text-xs text-[#A9B3BD]">
                  AFFECTED ASSET: <span className="font-bold text-[#E7EBEF]">{currentRecord.drone_id}</span>
                </div>
              </div>

              {/* Justification Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Reason & Evidence */}
                <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3.5 space-y-2.5">
                  <div>
                    <span className="text-[10px] text-[#707C88] font-bold block">TRIGGERING REASON:</span>
                    <p className="text-[#E7EBEF] font-bold mt-0.5 leading-snug">{currentRecord.reason}</p>
                  </div>

                  <div className="border-t border-[#2B3743] pt-2">
                    <span className="text-[10px] text-[#707C88] font-bold block">MULTIMODAL SENSOR EVIDENCE:</span>
                    <p className="text-[#5B8FB9] mt-0.5 leading-snug bg-[#151D26] p-2 rounded border border-[#2B3743]">
                      {currentRecord.evidence}
                    </p>
                  </div>
                </div>

                {/* Confidence & Risk delta */}
                <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between bg-[#151D26] p-2 rounded border border-[#2B3743]">
                    <span className="text-[#707C88] text-[10px] font-bold">AI CERTAINTY CONFIDENCE:</span>
                    <span className="text-[#10B981] font-extrabold text-sm">{currentRecord.confidence_pct}%</span>
                  </div>

                  <div className="flex items-center justify-between bg-[#151D26] p-2 rounded border border-[#2B3743]">
                    <span className="text-[#707C88] text-[10px] font-bold">DISASTER RISK SCORE SHIFT:</span>
                    <span className="font-bold text-xs">
                      <span className="text-[#F59E0B]">{currentRecord.risk_before}</span>
                      <span className="text-[#707C88] mx-1">→</span>
                      <span className="text-[#10B981]">{currentRecord.risk_after}</span>
                    </span>
                  </div>

                  {/* Rejected Alternative */}
                  <div className="bg-[#1C0F13] border border-[#EF4444]/40 p-2.5 rounded space-y-1">
                    <div className="text-[10px] text-[#EF4444] font-extrabold flex items-center space-x-1">
                      <XCircle className="w-3 h-3" />
                      <span>ALTERNATIVE REJECTED:</span>
                    </div>
                    <div className="text-[11px] text-[#E7EBEF]">{currentRecord.alternative_considered}</div>
                    <div className="text-[10px] text-[#707C88]">
                      REJECTED BECAUSE: <span className="text-[#EF4444]">{currentRecord.rejected_because}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* WHY vs. WHY NOT Comparative Decision Rationale */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {/* Selected: WHY? */}
                <div className="bg-[#11171E] border border-[#10B981]/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between border-b border-[#2B3743] pb-1.5">
                    <span className="text-[10px] text-[#10B981] font-extrabold flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>SELECTED ACTION: Delta-4 Path</span>
                    </span>
                    <span className="text-[10px] font-extrabold bg-[#10B981]/20 text-[#10B981] px-1.5 py-0.2 rounded">
                      WHY?
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex items-center space-x-1.5 text-[#10B981]">
                      <span>✓</span>
                      <span>Lower structural collapse risk (Hazard score: 28 vs 94)</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-[#10B981]">
                      <span>✓</span>
                      <span>4.2m clearance (&gt; 2.8m Gate G5 safety buffer)</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-[#10B981]">
                      <span>✓</span>
                      <span>82% RF mesh communication confidence preserved</span>
                    </div>
                  </div>
                </div>

                {/* Rejected: WHY NOT? */}
                <div className="bg-[#1C0F13] border border-[#EF4444]/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between border-b border-[#2B3743] pb-1.5">
                    <span className="text-[10px] text-[#EF4444] font-extrabold flex items-center space-x-1">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>REJECTED PATH: Bravo-1 Original</span>
                    </span>
                    <span className="text-[10px] font-extrabold bg-[#EF4444]/20 text-[#EF4444] px-1.5 py-0.2 rounded">
                      WHY NOT?
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex items-center space-x-1.5 text-[#EF4444]">
                      <span>✗</span>
                      <span>Building collapse detected on primary corridor</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-[#EF4444]">
                      <span>✗</span>
                      <span>Clearance = 2.5m (Safety threshold &gt; 2.8m breached)</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-[#EF4444]">
                      <span>✗</span>
                      <span>Flood surge probability high; risk threshold exceeded</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
