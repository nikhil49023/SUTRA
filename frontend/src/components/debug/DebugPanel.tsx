/**
 * Smart Horizon GCS — Developer Diagnostics & Protocol Debug Panel
 * Section 37: Real-time telemetry, state versioning, pending command queue & dropped event metrics.
 */

import React, { useState, useEffect } from 'react';
import { useCommunicationStore } from '../../stores/communicationStore';
import { useCommandStore } from '../../stores/commandStore';
import { messageRouter } from '../../communication/MessageRouter';
import { wsClient } from '../../communication/WebSocketClient';
import {
  Terminal,
  Activity,
  Zap,
  RefreshCw,
  X,
} from 'lucide-react';

export const DebugPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const commStore = useCommunicationStore();
  const commandStore = useCommandStore();
  const [metrics, setMetrics] = useState({
    stateVersion: 0,
    lastEventId: null as string | null,
    droppedStale: 0,
    droppedDuplicate: 0,
    droppedOutOfOrder: 0,
    stateGaps: 0,
  });

  // Hotkey '~' toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '`' || e.key === '~') {
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Periodic metrics poll
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setMetrics({
        stateVersion: messageRouter.getLastStateVersion(),
        lastEventId: messageRouter.lastProcessedEventId,
        droppedStale: messageRouter.droppedStaleEventsCount,
        droppedDuplicate: messageRouter.droppedDuplicateEventsCount,
        droppedOutOfOrder: messageRouter.droppedOutOfOrderTelemCount,
        stateGaps: messageRouter.stateGapCount,
      });
    }, 500);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-4 z-40 px-2 py-1 bg-slate-900/90 border border-slate-700/80 rounded shadow-lg text-[10px] font-mono text-cyan-400 hover:text-white flex items-center space-x-1 backdrop-blur"
        title="Open Developer Debug HUD (~)"
      >
        <Terminal className="w-3 h-3 text-cyan-400" />
        <span>DEV HUD</span>
      </button>
    );
  }

  const commandsList = Object.values(commandStore.commands).slice(-6).reverse();

  return (
    <div className="fixed bottom-8 right-4 z-50 w-96 max-h-[80vh] bg-[#090d14]/98 border border-cyan-500/40 rounded-xl shadow-2xl p-3 font-mono text-xs text-slate-200 flex flex-col space-y-2 backdrop-blur-md select-none overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
        <div className="flex items-center space-x-1.5 font-bold text-cyan-300 text-[11px]">
          <Zap className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>VAAYU SWARM PROTOCOL DEBUGGER</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 text-slate-400 hover:text-white"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Protocol Metrics Grid */}
      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
        <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
          <span className="text-slate-400 block">STATE VERSION</span>
          <span className="font-bold text-cyan-300 text-xs tabular-nums">
            v{metrics.stateVersion}
          </span>
        </div>

        <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
          <span className="text-slate-400 block">WS LATENCY</span>
          <span className="font-bold text-emerald-400 text-xs tabular-nums">
            {commStore.latency_ms} ms
          </span>
        </div>

        <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
          <span className="text-slate-400 block">LINK STATE</span>
          <span className={`font-bold ${commStore.websocket_state === 'CONNECTED' ? 'text-emerald-400' : 'text-amber-400'}`}>
            {commStore.websocket_state}
          </span>
        </div>

        <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
          <span className="text-slate-400 block">RECONNECTS</span>
          <span className="font-bold text-slate-300 tabular-nums">
            {commStore.reconnect_count} attempts
          </span>
        </div>
      </div>

      {/* Anomaly / Dropped Events Counter */}
      <div className="bg-slate-950 p-2 rounded border border-slate-800 space-y-1 text-[10px]">
        <div className="text-slate-400 font-bold border-b border-slate-800/80 pb-0.5">
          PROTECTION & IDEMPOTENCY FILTERS
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Dropped Duplicate Events:</span>
          <span className="font-bold text-slate-200 tabular-nums">{metrics.droppedDuplicate}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Dropped Stale Events:</span>
          <span className="font-bold text-slate-200 tabular-nums">{metrics.droppedStale}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Dropped Out-Of-Order Telem:</span>
          <span className="font-bold text-slate-200 tabular-nums">{metrics.droppedOutOfOrder}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">State Version Gaps:</span>
          <span className="font-bold text-amber-400 tabular-nums">{metrics.stateGaps}</span>
        </div>
      </div>

      {/* In-Flight & Recent Commands */}
      <div className="bg-slate-950 p-2 rounded border border-slate-800 space-y-1 text-[10px]">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-0.5">
          <span className="text-slate-400 font-bold">RECENT COMMANDS ({commandsList.length})</span>
          <button
            onClick={() => commandStore.clearHistory()}
            className="text-[9px] text-slate-500 hover:text-slate-300"
          >
            Clear
          </button>
        </div>

        <div className="space-y-1 max-h-28 overflow-y-auto pr-0.5">
          {commandsList.length === 0 ? (
            <div className="text-slate-500 text-center py-2">No command history.</div>
          ) : (
            commandsList.map((cmd) => (
              <div
                key={cmd.command_id}
                className="p-1 rounded bg-slate-900 border border-slate-800 flex items-center justify-between text-[9px]"
              >
                <span className="text-slate-300 truncate max-w-[180px]">{cmd.command_type}</span>
                <span
                  className={`px-1 rounded font-bold ${
                    cmd.status === 'ACCEPTED' || cmd.status === 'COMPLETED'
                      ? 'bg-emerald-950 text-emerald-300'
                      : cmd.status === 'REJECTED' || cmd.status === 'FAILED'
                      ? 'bg-rose-950 text-rose-300'
                      : cmd.status === 'TIMEOUT'
                      ? 'bg-amber-950 text-amber-300'
                      : 'bg-cyan-950 text-cyan-300 animate-pulse'
                  }`}
                >
                  {cmd.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Manual Snapshot Recovery Actions */}
      <div className="flex space-x-1 pt-1">
        <button
          onClick={() => wsClient.requestStateSnapshot()}
          className="flex-1 py-1 rounded bg-cyan-950 border border-cyan-500/50 hover:bg-cyan-900 text-cyan-300 text-[10px] font-bold flex items-center justify-center space-x-1"
        >
          <RefreshCw className="w-3 h-3" />
          <span>FULL SNAPSHOT</span>
        </button>
        <button
          onClick={() => messageRouter.resetMetrics()}
          className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-400 text-[10px]"
        >
          RESET METRICS
        </button>
      </div>
    </div>
  );
};
