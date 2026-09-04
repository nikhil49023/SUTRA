import React, { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useDefensiveUpgradesStore } from '../../stores/defensiveUpgradesStore';
import {
  LifeBuoy,
  MapPin,
  Users,
  ShieldAlert,
  Ship,
  CheckCircle2,
  X,
  Send,
  Radio,
  FileCode,
  Flame,
  ArrowDown,
} from 'lucide-react';

export const GroundRescueHandoffModal: React.FC = () => {
  const rescueHandoffOpen = useAppStore((s) => s.rescueHandoffOpen);
  const setRescueHandoffOpen = useAppStore((s) => s.setRescueHandoffOpen);

  const rescueReports = useDefensiveUpgradesStore((s) => s.rescueReports);
  const isDispatching = useDefensiveUpgradesStore((s) => s.isDispatching);
  const dispatchGroundTeam = useDefensiveUpgradesStore((s) => s.dispatchGroundTeam);

  const [selectedReportId, setSelectedReportId] = useState<string>('sar-ndma-01');
  const [selectedTeam, setSelectedTeam] = useState<string>('NDMA 4th Battalion Rescue Unit (Boat Bravo)');

  if (!rescueHandoffOpen) return null;

  const currentReport = rescueReports.find((r) => r.report_id === selectedReportId) || rescueReports[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none font-mono">
      <div className="w-full max-w-3xl bg-[#0B0F14] border border-[#2B3743] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#11171E] border-b border-[#2B3743] px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded bg-[#10B981]/20 border border-[#10B981]/60 flex items-center justify-center text-[#10B981]">
              <LifeBuoy className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm text-[#E7EBEF] tracking-wide">
                  NDMA GROUND RESCUE HANDOFF & HUMAN COORDINATION
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981]">
                  PRIORITY 4
                </span>
              </div>
              <span className="text-[10px] text-[#707C88]">
                Connects autonomous drone reconnaissance to field disaster response ground units
              </span>
            </div>
          </div>
          <button
            onClick={() => setRescueHandoffOpen(false)}
            className="p-1 rounded text-[#707C88] hover:text-[#E7EBEF] hover:bg-[#151D26] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar">
          {currentReport ? (
            <div className="space-y-4">
              {/* Step-by-Step Flow Cascade */}
              <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-4 space-y-3">
                <span className="text-[11px] text-[#707C88] font-bold tracking-wider uppercase block border-b border-[#2B3743] pb-2">
                  SURVIVOR RECONNAISSANCE CASCADE:
                </span>

                <div className="space-y-2 text-xs">
                  {/* 1. Survivor & Confidence */}
                  <div className="flex items-center justify-between bg-[#151D26] p-2.5 rounded border border-[#2B3743]">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                      <span className="font-extrabold text-[#E7EBEF]">{currentReport.survivor_tag}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[#707C88]">AI TRI-MODAL CONFIDENCE:</span>
                      <span className="font-bold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded">
                        {currentReport.confidence_score}%
                      </span>
                    </div>
                  </div>

                  {/* 2. Geolocation */}
                  <div className="flex items-center justify-between bg-[#151D26] p-2.5 rounded border border-[#2B3743]">
                    <div className="flex items-center space-x-2 text-[#5B8FB9]">
                      <MapPin className="w-4 h-4" />
                      <span className="text-[#707C88]">WGS-84 GPS:</span>
                      <span className="font-bold text-[#E7EBEF]">
                        {currentReport.latitude.toFixed(5)}° N, {currentReport.longitude.toFixed(5)}° E
                      </span>
                    </div>
                    <div className="text-[11px] text-[#707C88]">
                      AGL Elevation: <span className="font-bold text-[#E7EBEF]">{currentReport.altitude_agl_m}m</span>
                    </div>
                  </div>

                  {/* 3. Number of People & Access Difficulty */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="bg-[#151D26] p-2.5 rounded border border-[#2B3743]">
                      <div className="text-[#707C88] text-[10px] font-bold flex items-center space-x-1 mb-1">
                        <Users className="w-3 h-3 text-[#5B8FB9]" />
                        <span>DETECTED PERSONS:</span>
                      </div>
                      <div className="text-sm font-extrabold text-[#E7EBEF]">
                        {currentReport.people_count} Trapped Survivors
                      </div>
                      <div className="text-[10px] text-[#A9B3BD] mt-0.5">
                        {currentReport.tri_modal_evidence}
                      </div>
                    </div>

                    <div className="bg-[#151D26] p-2.5 rounded border border-[#C49A4A]/40">
                      <div className="text-[#C49A4A] text-[10px] font-bold flex items-center space-x-1 mb-1">
                        <ShieldAlert className="w-3 h-3" />
                        <span>ACCESS DIFFICULTY:</span>
                      </div>
                      <div className="text-xs font-bold text-[#E7EBEF] leading-tight">
                        {currentReport.access_difficulty}
                      </div>
                    </div>
                  </div>

                  {/* 4. Recommended Rescue Method */}
                  <div className="bg-[#151D26] p-3 rounded border border-[#5B8FB9]/50 flex items-start space-x-3">
                    <div className="w-7 h-7 rounded bg-[#5B8FB9]/20 border border-[#5B8FB9]/40 flex items-center justify-center text-[#5B8FB9] flex-shrink-0 mt-0.5">
                      <Ship className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] text-[#5B8FB9] font-extrabold uppercase">
                        RECOMMENDED RESCUE METHOD:
                      </div>
                      <div className="text-xs font-bold text-[#E7EBEF] mt-0.5">
                        {currentReport.recommended_method}
                      </div>
                      <div className="text-[10px] text-[#707C88] mt-0.5">
                        Synthesized from 2.4m flood depth, building structural fragility, and current water velocity.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ground Team Dispatch Action */}
              <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
                  <span className="text-xs font-bold text-[#E7EBEF] flex items-center space-x-1.5">
                    <Radio className="w-3.5 h-3.5 text-[#5B8FB9]" />
                    <span>GROUND RESCUE DISPATCH COMMAND</span>
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      currentReport.dispatch_status === 'DISPATCHED'
                        ? 'bg-[#10B981]/10 border-[#10B981]/40 text-[#10B981]'
                        : 'bg-[#F59E0B]/10 border-[#F59E0B]/40 text-[#F59E0B]'
                    }`}
                  >
                    STATUS: {currentReport.dispatch_status}
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-[#707C88] font-bold block">ASSIGN FIELD RESCUE TEAM:</label>
                  <select
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="w-full bg-[#151D26] border border-[#2B3743] rounded-md px-3 py-2 text-xs text-[#E7EBEF] font-mono outline-none focus:border-[#5B8FB9]"
                  >
                    <option value="NDMA 4th Battalion Rescue Unit (Boat Bravo)">
                      NDMA 4th Battalion Rescue Unit (Inflatable Boat Bravo — ETA 8.5m)
                    </option>
                    <option value="SDRF Urban Search & High-Angle Winch Team">
                      SDRF Urban Search & High-Angle Winch Team (Team 02 — ETA 12m)
                    </option>
                    <option value="IAF Mi-17 V5 Aerial Winch Extraction Pod">
                      IAF Mi-17 V5 Aerial Winch Extraction Pod (Helo-Alpha — ETA 18m)
                    </option>
                  </select>
                </div>

                <div className="pt-2 flex items-center space-x-3">
                  <button
                    onClick={() => dispatchGroundTeam(currentReport.report_id, selectedTeam)}
                    disabled={isDispatching || currentReport.dispatch_status === 'DISPATCHED'}
                    className={`flex-1 py-2.5 rounded-lg font-extrabold text-xs tracking-wider flex items-center justify-center space-x-2 transition cursor-pointer ${
                      currentReport.dispatch_status === 'DISPATCHED'
                        ? 'bg-[#10B981] text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                        : 'bg-[#5B8FB9] hover:bg-[#4A7A9E] text-white shadow-[0_0_12px_rgba(91,143,185,0.4)] active:scale-[0.98]'
                    }`}
                  >
                    {currentReport.dispatch_status === 'DISPATCHED' ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>DISPATCHED TO {currentReport.assigned_team.split('(')[0]}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>🚒 DISPATCH GROUND RESCUE TEAM (SEND CoT XML)</span>
                      </>
                    )}
                  </button>
                </div>

                {currentReport.dispatch_status === 'DISPATCHED' && (
                  <div className="p-2.5 rounded bg-[#151D26] border border-[#10B981]/30 text-[11px] text-[#10B981] flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Transmitted Cursor-on-Target XML packet to WinTAK/ATAK network.</span>
                    </span>
                    <span className="font-bold">ETA: {currentReport.estimated_arrival_mins} mins</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-[#707C88]">No active survivor reports found.</div>
          )}
        </div>
      </div>
    </div>
  );
};
