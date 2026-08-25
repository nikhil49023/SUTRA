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
    { id: '1', time: Date.now() - 30000, topic: 'COMMUNICATION', msg: 'WebSocket handshake established with authoritative Python backend.', level: 'INFO' },
    { id: '2', time: Date.now() - 25000, topic: 'MISSION', msg: 'Authoritative State Snapshot hydrated: ALPHA RECON ready.', level: 'INFO' },
    { id: '3', time: Date.now() - 20000, topic: 'FLEET', msg: 'Swarm formation geometry configured: V_FORMATION (25m spacing).', level: 'INFO' },
    { id: '4', time: Date.now() - 15000, topic: 'SAFETY', msg: 'ORCA 3D Safety Buffer active. 3 geofence polygons verified.', level: 'INFO' },
  ]);

  if (!isConsoleOpen) {
    return (
      <button
        onClick={toggleConsole}
        className="h-6 bg-[#0B0F14] border-t border-[#2B3743] px-3 flex items-center justify-between text-[11px] font-mono text-[#707C88] hover:text-[#5B8FB9] select-none z-30"
      >
        <div className="flex items-center space-x-1.5">
          <Terminal className="w-3 h-3 text-[#5B8FB9]" />
          <span>SHOW CONSOLE</span>
        </div>
        <ChevronUp className="w-3.5 h-3.5" />
      </button>
    );
  }

  const handleClear = () => setLogs([]);

  return (
    <div className="h-36 bg-[#0B0F14]/98 border-t border-[#2B3743] flex flex-col font-mono text-xs select-none z-30 shadow-2xl">
      {/* Console Tab Header */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#11171E] border-b border-[#2B3743]">
        <div className="flex space-x-1">
          {(['TELEMETRY', 'MISSION', 'SAFETY', 'COMMUNICATION', 'AI', 'SYSTEM'] as const).map((tab) => {
            const isActive = activeConsoleTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveConsoleTab(tab)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                  isActive
                    ? 'bg-[#1B2530] border-[#5B8FB9] text-[#E7EBEF]'
                    : 'border-transparent text-[#707C88] hover:text-[#E7EBEF]'
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
            className={`p-1 rounded text-[#707C88] hover:text-[#E7EBEF] ${isPaused ? 'text-[#C49A4A]' : ''}`}
            title={isPaused ? 'Resume Logging' : 'Pause Logging'}
          >
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          </button>
          <button
            onClick={handleClear}
            className="p-1 rounded text-[#707C88] hover:text-[#C75A5A]"
            title="Clear Console"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <button
            onClick={toggleConsole}
            className="p-1 rounded text-[#707C88] hover:text-[#E7EBEF]"
            title="Minimize Console"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Log Output Area */}
      <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] space-y-1 bg-[#0B0F14]">
        {logs.map((log) => (
          <div key={log.id} className="flex items-start space-x-2">
            <span className="text-[#707C88] tabular-nums">{formatTimestamp(log.time)}</span>
            <span className="px-1 rounded bg-[#151D26] border border-[#2B3743] text-[9px] text-[#5B8FB9] font-bold">
              {log.topic}
            </span>
            <span className="text-[#E7EBEF]">{log.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
