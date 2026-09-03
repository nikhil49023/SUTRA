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
        return 'text-[#4F9A72] border-[#4F9A72]/40 bg-[#151D26]';
      case 'CONNECTING':
      case 'AUTHENTICATING':
      case 'RECONNECTING':
        return 'text-[#C49A4A] border-[#C49A4A]/40 bg-[#151D26] animate-pulse';
      case 'ERROR':
      case 'TIMEOUT':
      case 'FALLBACK':
      case 'DISCONNECTED':
      default:
        return 'text-[#C75A5A] border-[#C75A5A]/40 bg-[#151D26]';
    }
  };

  return (
    <div className="flex items-center space-x-2 text-xs font-mono">
      {/* WS State Badge */}
      <div className={`flex items-center space-x-1.5 px-2 py-0.5 rounded border ${getStatusColor()}`}>
        {websocket_state === 'READY' || websocket_state === 'CONNECTED' ? (
          <Wifi className="w-3.5 h-3.5 text-[#4F9A72]" />
        ) : websocket_state === 'RECONNECTING' || websocket_state === 'CONNECTING' ? (
          <RefreshCw className="w-3.5 h-3.5 text-[#C49A4A] animate-spin" />
        ) : (
          <WifiOff className="w-3.5 h-3.5 text-[#C75A5A]" />
        )}
        <span className="font-semibold uppercase tracking-wider">
          WS: {websocket_state}
          {is_stale && websocket_state !== 'READY' && ' (STALE)'}
        </span>
      </div>

      {/* Latency badge */}
      <div className="flex items-center space-x-1 px-2 py-0.5 rounded border border-[#2B3743] bg-[#11171E] text-[#A9B3BD]">
        <Activity className="w-3 h-3 text-[#5B8FB9]" />
        <span>{latency_ms > 0 ? `${latency_ms}ms` : '--'}</span>
      </div>

      {/* MAVLink State Badge */}
      <div className="hidden sm:flex items-center space-x-1 px-2 py-0.5 rounded border border-[#2B3743] bg-[#11171E] text-[#A9B3BD]">
        <span className="text-[#707C88]">MAV:</span>
        <span className={mavlink_state === 'ACTIVE' || mavlink_state === 'CONNECTED' ? 'text-[#4F9A72]' : 'text-[#707C88]'}>
          {mavlink_state}
        </span>
      </div>

      {/* Reconnect button when disconnected */}
      {websocket_state !== 'READY' && websocket_state !== 'CONNECTED' && (
        <button
          onClick={() => wsClient.connect()}
          className="px-2 py-0.5 rounded bg-[#151D26] border border-[#5B8FB9] text-[#5B8FB9] hover:bg-[#1B2530] text-[11px] transition flex items-center space-x-1"
          title="Manual Reconnect"
        >
          <RefreshCw className="w-3 h-3" />
          <span>RETRY</span>
        </button>
      )}
    </div>
  );
};
