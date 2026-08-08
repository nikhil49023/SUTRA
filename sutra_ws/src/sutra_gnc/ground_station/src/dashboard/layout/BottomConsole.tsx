import React, { useState } from 'react';
import { Terminal, Activity, Compass, Cpu, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Logger } from '../../logging';

export const BottomConsole: React.FC = () => {
  const [activeConsoleTab, setActiveConsoleTab] = useState<'TELEMETRY' | 'EVENTS' | 'AI' | 'ALERTS' | 'MAVLINK'>('TELEMETRY');
  const logs = Logger.getLogs();

  return (
    <footer className="h-44 bg-[#080d1a] border-t border-[#1b253b] flex flex-col font-mono select-none overflow-hidden z-20 shrink-0">
      {/* CONSOLE TAB SELECTORS */}
      <div className="h-9 px-3 bg-[#0a1224] border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-1">
          {(
            [
              { id: 'TELEMETRY', label: 'Telemetry Stream' },
              { id: 'EVENTS', label: 'Mission Events' },
              { id: 'AI', label: 'AI Decisions' },
              { id: 'ALERTS', label: 'Safety Alerts' },
              { id: 'MAVLINK', label: 'MAVLink Packets' }
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveConsoleTab(tab.id)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                activeConsoleTab === tab.id
                  ? 'bg-slate-800 text-cyan-400 font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-[10px] text-slate-500 font-bold">REALTIME CONSOLE BUS</span>
      </div>

      {/* CONSOLE BODY STREAM */}
      <div className="flex-1 p-3 overflow-y-auto font-mono text-xs space-y-1 scrollbar-thin scrollbar-thumb-slate-800 bg-[#040710]">
        {logs.length === 0 ? (
          <div className="text-slate-600">Console ready. Listening for MAVLink telemetry and mission events...</div>
        ) : (
          logs.slice(0, 15).map((log) => (
            <div key={log.id} className="flex items-center space-x-2 text-[11px]">
              <span className="text-slate-500 font-bold">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
              <span className={`font-bold ${log.level === 'ERROR' ? 'text-red-400' : log.level === 'WARN' ? 'text-amber-400' : 'text-cyan-400'}`}>
                [{log.category}]
              </span>
              <span className="text-slate-300">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </footer>
  );
};
