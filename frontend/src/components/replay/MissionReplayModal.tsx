import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useDefensiveUpgradesStore, ReplayEvent } from '../../stores/defensiveUpgradesStore';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Clock,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Shield,
  Radio,
  X,
  MapPin,
  ChevronRight,
  Trophy,
  Award,
  Download,
  ShieldCheck,
} from 'lucide-react';

export const MissionReplayModal: React.FC = () => {
  const replayOpen = useAppStore((s) => s.replayOpen);
  const setReplayOpen = useAppStore((s) => s.setReplayOpen);

  const replayEvents = useDefensiveUpgradesStore((s) => s.replayEvents);
  const replayCursorIdx = useDefensiveUpgradesStore((s) => s.replayCursorIdx);
  const replayIsPlaying = useDefensiveUpgradesStore((s) => s.replayIsPlaying);
  const replaySpeed = useDefensiveUpgradesStore((s) => s.replaySpeed);

  const setReplayCursor = useDefensiveUpgradesStore((s) => s.setReplayCursor);
  const setReplaySpeed = useDefensiveUpgradesStore((s) => s.setReplaySpeed);
  const toggleReplayPlay = useDefensiveUpgradesStore((s) => s.toggleReplayPlay);

  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [viewTab, setViewTab] = useState<'TIMELINE' | 'SCORECARD'>('TIMELINE');

  // Auto-advance cursor when playing
  useEffect(() => {
    if (!replayIsPlaying) return;
    const intervalMs = Math.max(200, 1500 / replaySpeed);
    const timer = setInterval(() => {
      if (replayCursorIdx < replayEvents.length - 1) {
        setReplayCursor(replayCursorIdx + 1);
      } else {
        toggleReplayPlay(); // Pause at end
      }
    }, intervalMs);
    return () => clearInterval(timer);
  }, [replayIsPlaying, replayCursorIdx, replaySpeed, replayEvents.length, setReplayCursor, toggleReplayPlay]);

  if (!replayOpen) return null;

  const filteredEvents = replayEvents.filter((ev) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'DETECTIONS') return ev.category === 'DETECTION';
    if (activeFilter === 'CORRIDOR') return ev.category === 'CORRIDOR' || ev.category === 'REPLAN';
    if (activeFilter === 'BATTERY') return ev.category === 'BATTERY' || ev.category === 'CHARGING';
    return true;
  });

  const currentEvent = replayEvents[replayCursorIdx] || replayEvents[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none font-mono">
      <div className="w-full max-w-4xl bg-[#0B0F14] border border-[#2B3743] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#11171E] border-b border-[#2B3743] px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded bg-[#5B8FB9]/20 border border-[#5B8FB9]/60 flex items-center justify-center text-[#5B8FB9]">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm text-[#E7EBEF] tracking-wide">
                  FORENSIC MISSION REPLAY & AFTER-ACTION REVIEW (AAR)
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#5B8FB9]/20 border border-[#5B8FB9]/40 text-[#5B8FB9]">
                  PRIORITY 2
                </span>
              </div>
              <span className="text-[10px] text-[#707C88]">
                Auditable chronological blackbox timeline of swarm events and autonomous replanning
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-[#151D26] p-0.5 rounded border border-[#2B3743]">
              <button
                onClick={() => setViewTab('TIMELINE')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${
                  viewTab === 'TIMELINE' ? 'bg-[#5B8FB9] text-black font-extrabold' : 'text-[#707C88] hover:text-[#E7EBEF]'
                }`}
              >
                TIMELINE
              </button>
              <button
                onClick={() => setViewTab('SCORECARD')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition flex items-center space-x-1 ${
                  viewTab === 'SCORECARD' ? 'bg-[#10B981] text-black font-extrabold' : 'text-[#707C88] hover:text-[#E7EBEF]'
                }`}
              >
                <Trophy className="w-3 h-3" />
                <span>MISSION SCORECARD</span>
              </button>
            </div>

            <button
              onClick={() => setReplayOpen(false)}
              className="p-1 rounded text-[#707C88] hover:text-[#E7EBEF] hover:bg-[#151D26] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar flex-1 flex flex-col">
          {viewTab === 'SCORECARD' ? (
            <div className="flex flex-col items-center justify-center p-4">
              <div className="w-full max-w-xl bg-[#090D11] border-2 border-[#10B981] rounded-xl p-6 shadow-[0_0_30px_rgba(16,185,129,0.2)] font-mono">
                <div className="text-center border-b border-[#2B3743] pb-3 mb-4">
                  <div className="flex items-center justify-center space-x-2 text-[#10B981]">
                    <Trophy className="w-5 h-5" />
                    <span className="font-black text-base tracking-widest uppercase">SUTRA MISSION SCORECARD</span>
                  </div>
                  <div className="text-[10px] text-[#707C88] mt-1">INCIDENT AAR — KEDARNATH SECTOR BRAVO SEARCH & RESCUE</div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-[#1A232D]">
                    <span className="text-[#707C88]">Mission duration</span>
                    <span className="font-extrabold text-[#E7EBEF]">02:14</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#1A232D]">
                    <span className="text-[#707C88]">UAVs deployed</span>
                    <span className="font-extrabold text-[#E7EBEF]">5</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#1A232D]">
                    <span className="text-[#707C88]">Survivors detected</span>
                    <span className="font-extrabold text-[#5B8FB9]">3</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#1A232D]">
                    <span className="text-[#707C88]">Survivors confirmed</span>
                    <span className="font-extrabold text-[#10B981]">3 (100% Tri-Modal verified)</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#1A232D]">
                    <span className="text-[#707C88]">Search coverage</span>
                    <span className="font-extrabold text-[#10B981]">94.7%</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#1A232D]">
                    <span className="text-[#707C88]">Critical hazards</span>
                    <span className="font-extrabold text-[#EF4444]">2 (Avoided via OctoMap)</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#1A232D]">
                    <span className="text-[#707C88]">Replans</span>
                    <span className="font-extrabold text-[#F59E0B]">3 (Sub-second ORCA 3D)</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#1A232D]">
                    <span className="text-[#707C88]">UAV failures</span>
                    <span className="font-extrabold text-[#EF4444]">1 (Reserve UAV deployed)</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#1A232D]">
                    <span className="text-[#707C88]">Mission continuity</span>
                    <span className="font-extrabold text-[#10B981]">100% Zero Interruption</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#1A232D]">
                    <span className="text-[#707C88]">Communication uptime</span>
                    <span className="font-extrabold text-[#5B8FB9]">98.4% (802.11s Mesh)</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-[#707C88]">Energy reserve maintained</span>
                    <span className="font-extrabold text-[#10B981]">✓ (All UAVs &gt; 25% RTL)</span>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t-2 border-[#10B981] text-center">
                  <div className="inline-block px-5 py-1.5 rounded-full bg-[#10B981]/20 border border-[#10B981] text-[#10B981] font-black text-sm tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    MISSION SUCCESS
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Active Highlight Event Banner */}
              <div className="bg-[#151D26] border border-[#5B8FB9]/50 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-start space-x-3">
              <div className="text-xl font-extrabold text-[#5B8FB9] tracking-wider mt-0.5">
                {currentEvent?.timestamp_str}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#11171E] border border-[#2B3743] text-[#A9B3BD]">
                    {currentEvent?.category}
                  </span>
                  <span className="font-bold text-sm text-[#E7EBEF]">{currentEvent?.title}</span>
                  {currentEvent?.drone_id && (
                    <span className="text-[10px] font-bold text-[#5B8FB9] bg-[#5B8FB9]/10 px-1.5 py-0.5 rounded">
                      {currentEvent.drone_id}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#A9B3BD] mt-1">{currentEvent?.detail}</p>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <span className="text-[10px] text-[#707C88] block">TIMELINE EVENT</span>
              <span className="text-sm font-extrabold text-[#E7EBEF]">
                {replayCursorIdx + 1} / {replayEvents.length}
              </span>
            </div>
          </div>

          {/* Timeline Scrubber & Player Controls */}
          <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3.5 space-y-3">
            {/* Scrubber Bar */}
            <div className="space-y-1">
              <input
                type="range"
                min={0}
                max={replayEvents.length - 1}
                value={replayCursorIdx}
                onChange={(e) => setReplayCursor(parseInt(e.target.value))}
                className="w-full accent-[#5B8FB9] cursor-pointer h-1.5 bg-[#151D26] rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-[#707C88]">
                <span>19:42:01 (Start)</span>
                <span>SCRUBBER TIMELINE</span>
                <span>19:43:40 (Rescue Handoff)</span>
              </div>
            </div>

            {/* Play/Pause & Speed Buttons */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleReplayPlay}
                  className="px-4 py-1.5 rounded-md bg-[#5B8FB9] hover:bg-[#4A7A9E] text-white font-bold text-xs flex items-center space-x-1.5 transition shadow-[0_0_10px_rgba(91,143,185,0.4)]"
                >
                  {replayIsPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{replayIsPlaying ? 'PAUSE' : 'PLAY REPLAY'}</span>
                </button>

                <button
                  onClick={() => setReplayCursor(0)}
                  className="p-1.5 rounded bg-[#151D26] hover:bg-[#1B2530] border border-[#2B3743] text-[#A9B3BD] hover:text-[#E7EBEF] transition"
                  title="Reset to mission beginning"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Playback Speed Multipliers */}
              <div className="flex items-center space-x-1">
                <span className="text-[10px] text-[#707C88] mr-1">SPEED:</span>
                {[0.5, 1.0, 2.0, 5.0, 10.0].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setReplaySpeed(spd)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                      replaySpeed === spd
                        ? 'bg-[#5B8FB9] text-white'
                        : 'bg-[#151D26] text-[#707C88] hover:text-[#E7EBEF] border border-[#2B3743]'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-[#707C88] font-bold flex items-center space-x-1">
              <Filter className="w-3 h-3" />
              <span>FILTER:</span>
            </span>
            {['ALL', 'DETECTIONS', 'CORRIDOR', 'BATTERY'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition ${
                  activeFilter === cat
                    ? 'bg-[#1B2530] text-[#5B8FB9] border border-[#5B8FB9]/50'
                    : 'bg-[#11171E] text-[#707C88] hover:text-[#E7EBEF] border border-[#2B3743]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Forensic Event List (User's exact requested timeline) */}
          <div className="flex-1 bg-[#11171E] border border-[#2B3743] rounded-lg p-3 overflow-y-auto custom-scrollbar space-y-1.5">
            {filteredEvents.map((evt, idx) => {
              const isSelected = replayEvents[replayCursorIdx]?.event_id === evt.event_id;

              return (
                <div
                  key={evt.event_id}
                  onClick={() => {
                    const originalIdx = replayEvents.findIndex((e) => e.event_id === evt.event_id);
                    if (originalIdx !== -1) setReplayCursor(originalIdx);
                  }}
                  className={`p-2.5 rounded-lg border transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#1B2530] border-[#5B8FB9] text-[#E7EBEF] shadow-[0_0_10px_rgba(91,143,185,0.2)]'
                      : 'bg-[#151D26] border-[#2B3743] text-[#A9B3BD] hover:border-[#5B8FB9]/40 hover:bg-[#18222D]'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <span className="text-xs font-extrabold text-[#5B8FB9] tabular-nums flex-shrink-0">
                      {evt.timestamp_str}
                    </span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        evt.severity === 'CRITICAL'
                          ? 'bg-[#EF4444]'
                          : evt.severity === 'WARNING'
                          ? 'bg-[#F59E0B]'
                          : evt.severity === 'SUCCESS'
                          ? 'bg-[#10B981]'
                          : 'bg-[#5B8FB9]'
                      }`}
                    />
                    <div className="truncate">
                      <span className="font-bold text-xs text-[#E7EBEF]">{evt.title}</span>
                      <span className="text-[10px] text-[#707C88] ml-2 hidden sm:inline">{evt.detail}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                    {evt.drone_id && (
                      <span className="text-[9px] font-bold bg-[#11171E] px-1.5 py-0.5 rounded border border-[#2B3743] text-[#707C88]">
                        {evt.drone_id}
                      </span>
                    )}
                    <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-[#5B8FB9]' : 'text-[#707C88]'}`} />
                  </div>
                </div>
              );
            })}
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
};
