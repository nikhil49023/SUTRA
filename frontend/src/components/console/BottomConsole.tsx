import React, { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useAlertStore } from '../../stores/alertStore';
import { useCommunicationStore } from '../../stores/communicationStore';
import { formatTimestamp } from '../../utils/formatting';
import { Terminal, Trash2, Pause, Play, ChevronDown, ChevronUp } from 'lucide-react';

export const BottomConsole: React.FC = () => {
  const { isConsoleOpen, toggleConsole, activeConsoleTab, setActiveConsoleTab } = useAppStore();
  const { alerts } = useAlertStore();
  const { messages_received, messages_sent } = useCommunicationStore();
  const [isPaused, setIsPaused] = useState(false);
  const [logs, setLogs] = useState<{ id: string; time: number; topic: string; msg: string; level: string }[]>([
    { id: '1', time: Date.now() - 30000, topic: 'COMMUNICATION', msg: 'WebSocket handshake established with authoritative Python backend (10 Hz).', level: 'INFO' },
    { id: '2', time: Date.now() - 25000, topic: 'MISSION', msg: 'Authoritative State Snapshot hydrated: ALPHA RECON flight corridor ready.', level: 'INFO' },
    { id: '3', time: Date.now() - 20000, topic: 'FLEET', msg: 'Swarm formation geometry configured: V_FORMATION (25m spacing).', level: 'INFO' },
    { id: '4', time: Date.now() - 15000, topic: 'SAFETY', msg: 'ORCA 3D Safety Buffer active. 3 geofence perimeter polygons verified.', level: 'INFO' },
  ]);

  if (!isConsoleOpen) {
    return (
      <button
        onClick={toggleConsole}
        className="h-7 bg-[#0B0F14] border-t border-[#2B3743] px-4 flex items-center justify-between text-[11px] font-mono text-[#707C88] hover:text-[#5B8FB9] select-none z-30 transition hover:bg-[#11171E] flex-shrink-0"
      >
        <div className="flex items-center space-x-2">
          <Terminal className="w-3.5 h-3.5 text-[#5B8FB9]" />
          <span className="font-bold tracking-wide">SYSTEM EVENT CONSOLE & TELEMETRY STREAM</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] text-[#707C88]">[{logs.length} events]</span>
          <ChevronUp className="w-3.5 h-3.5" />
        </div>
      </button>
    );
  }

  const handleClear = () => setLogs([]);

  return (
    <div className="h-40 bg-[#0B0F14]/98 border-t border-[#2B3743] flex flex-col font-mono text-xs select-none z-30 shadow-2xl flex-shrink-0">
      {/* Console Tab Header */}
      <div className="h-8 flex items-center justify-between px-3 bg-[#11171E] border-b border-[#2B3743] flex-shrink-0">
        <div className="flex items-center space-x-1">
          <div className="flex items-center space-x-1.5 mr-2 text-[#707C88] font-bold text-[10px]">
            <Terminal className="w-3.5 h-3.5 text-[#5B8FB9]" />
            <span className="hidden sm:inline">STREAM:</span>
          </div>

          {(['TELEMETRY', 'MISSION', 'SAFETY', 'COMMUNICATION', 'AI', 'SYSTEM'] as const).map((tab) => {
            const isActive = activeConsoleTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveConsoleTab(tab)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                  isActive
                    ? 'bg-[#1B2530] border-[#5B8FB9] text-[#E7EBEF] shadow-[0_0_8px_rgba(91,143,185,0.2)]'
                    : 'border-transparent text-[#707C88] hover:text-[#E7EBEF] hover:bg-[#151D26]'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`p-1 rounded text-[#707C88] hover:text-[#E7EBEF] transition hover:bg-[#151D26] ${isPaused ? 'text-[#C49A4A] font-bold' : ''}`}
            title={isPaused ? 'Resume Logging' : 'Pause Logging'}
          >
            {isPaused ? <Play className="w-3 h-3 text-[#4F9A72]" /> : <Pause className="w-3 h-3" />}
          </button>
          <button
            onClick={handleClear}
            className="p-1 rounded text-[#707C88] hover:text-[#C75A5A] transition hover:bg-[#151D26]"
            title="Clear Console Logs"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <button
            onClick={toggleConsole}
            className="p-1 rounded text-[#707C88] hover:text-[#E7EBEF] transition hover:bg-[#151D26]"
            title="Minimize Console"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Log Output Area */}
      <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] space-y-1 bg-[#0B0F14] custom-scrollbar">
        {logs.map((log) => (
          <div key={log.id} className="flex items-center space-x-2.5 hover:bg-[#11171E] px-1 py-0.5 rounded transition">
            <span className="text-[#707C88] tabular-nums flex-shrink-0 text-[10px]">{formatTimestamp(log.time)}</span>
            <span className="px-1.5 py-0.2 rounded bg-[#151D26] border border-[#2B3743] text-[9px] text-[#5B8FB9] font-bold flex-shrink-0">
              {log.topic}
            </span>
            <span className={`px-1 py-0.2 rounded text-[9px] font-bold flex-shrink-0 ${
              log.level === 'CRITICAL' ? 'bg-[#C75A5A]/20 text-[#C75A5A] border border-[#C75A5A]/50' :
              log.level === 'WARN' ? 'bg-[#C49A4A]/20 text-[#C49A4A] border border-[#C49A4A]/50' :
              'bg-[#4F9A72]/20 text-[#4F9A72] border border-[#4F9A72]/50'
            }`}>
              {log.level}
            </span>
            <span className="text-[#E7EBEF] truncate">{log.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
