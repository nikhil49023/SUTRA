import React from 'react';
import { useCommunicationStore } from '../stores/communicationStore';
import { wsClient } from './WebSocketClient';
import { Wifi, WifiOff, RefreshCw, Activity } from 'lucide-react';

export const ConnectionStatus: React.FC = () => {
  const { websocket_state, mavlink_state, latency_ms, is_stale, reconnect_count } =
    useCommunicationStore();

  const getStatusColor = () => {
    switch (websocket_state) {
      case 'READY':
      case 'CONNECTED':
        return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40';
      case 'CONNECTING':
      case 'AUTHENTICATING':
      case 'RECONNECTING':
        return 'text-amber-400 border-amber-500/40 bg-amber-950/40 animate-pulse';
      case 'ERROR':
      case 'TIMEOUT':
      case 'FALLBACK':
      case 'DISCONNECTED':
      default:
        return 'text-rose-400 border-rose-500/40 bg-rose-950/40';
    }
  };

  return (
    <div className="flex items-center space-x-2 text-xs font-mono">
      {/* WS State Badge */}
      <div className={`flex items-center space-x-1.5 px-2 py-0.5 rounded border ${getStatusColor()}`}>
        {websocket_state === 'READY' || websocket_state === 'CONNECTED' ? (
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
        ) : websocket_state === 'RECONNECTING' || websocket_state === 'CONNECTING' ? (
          <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
        ) : (
          <WifiOff className="w-3.5 h-3.5 text-rose-400" />
        )}
        <span className="font-semibold uppercase tracking-wider">
          WS: {websocket_state}
          {is_stale && websocket_state !== 'READY' && ' (STALE)'}
        </span>
      </div>

      {/* Latency badge */}
      <div className="flex items-center space-x-1 px-2 py-0.5 rounded border border-slate-700 bg-slate-900/60 text-slate-300">
        <Activity className="w-3 h-3 text-cyan-400" />
        <span>{latency_ms > 0 ? `${latency_ms}ms` : '--'}</span>
      </div>

      {/* MAVLink State Badge */}
      <div className="hidden sm:flex items-center space-x-1 px-2 py-0.5 rounded border border-slate-700 bg-slate-900/60 text-slate-300">
        <span className="text-slate-400">MAV:</span>
        <span className={mavlink_state === 'ACTIVE' || mavlink_state === 'CONNECTED' ? 'text-emerald-400' : 'text-slate-400'}>
          {mavlink_state}
        </span>
      </div>

      {/* Reconnect button when disconnected */}
      {websocket_state !== 'READY' && websocket_state !== 'CONNECTED' && (
        <button
          onClick={() => wsClient.connect()}
          className="px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-900 text-[11px] transition flex items-center space-x-1"
          title="Manual Reconnect"
        >
          <RefreshCw className="w-3 h-3" />
          <span>RETRY</span>
        </button>
      )}
    </div>
  );
};
