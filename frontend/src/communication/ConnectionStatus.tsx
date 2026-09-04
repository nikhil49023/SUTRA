import React, { useState, useRef, useEffect } from 'react';
import { useCommunicationStore } from '../stores/communicationStore';
import { wsClient } from './WebSocketClient';
import { Wifi, WifiOff, RefreshCw, Activity, Server, Globe, Check, X, Radio } from 'lucide-react';

export const ConnectionStatus: React.FC = () => {
  const { websocket_state, mavlink_state, latency_ms, is_stale, reconnect_count } =
    useCommunicationStore();

  const [isOpen, setIsOpen] = useState(false);
  const [endpointInput, setEndpointInput] = useState(() => wsClient.getUrl());
  const [currentUrl, setCurrentUrl] = useState(() => wsClient.getUrl());
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentUrl(wsClient.getUrl());
    setEndpointInput(wsClient.getUrl());
  }, [websocket_state, isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleConnect = (urlToUse?: string) => {
    const target = urlToUse || endpointInput;
    if (!target.trim()) return;
    wsClient.setEndpoint(target.trim());
    setCurrentUrl(wsClient.getUrl());
    setIsOpen(false);
  };

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
    <div className="relative flex items-center space-x-2 text-xs font-mono" ref={modalRef}>
      {/* WS State Badge — Clickable to configure Endpoint */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-1.5 px-2 py-0.5 rounded border transition hover:brightness-125 cursor-pointer ${getStatusColor()}`}
        title={`Click to connect to remote drone / laptop (Current: ${currentUrl})`}
      >
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
        <span className="text-[10px] text-[#707C88] ml-1">▼</span>
      </button>

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

      {/* Quick Connect / Remote Target Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-0.5 rounded bg-[#11171E] border border-[#2B3743] text-[#A9B3BD] hover:text-[#E7EBEF] hover:border-[#5B8FB9] text-[11px] transition flex items-center space-x-1 cursor-pointer"
        title="Connect to Remote Gazebo Sim / Companion Drone"
      >
        <Server className="w-3 h-3 text-[#5B8FB9]" />
        <span className="hidden md:inline">REMOTE</span>
      </button>

      {/* Reconnect button when disconnected */}
      {websocket_state !== 'READY' && websocket_state !== 'CONNECTED' && (
        <button
          onClick={() => wsClient.connect()}
          className="px-2 py-0.5 rounded bg-[#151D26] border border-[#5B8FB9] text-[#5B8FB9] hover:bg-[#1B2530] text-[11px] transition flex items-center space-x-1 cursor-pointer"
          title="Manual Reconnect"
        >
          <RefreshCw className="w-3 h-3" />
          <span>RETRY</span>
        </button>
      )}

      {/* Remote Endpoint Configuration Modal / Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-84 sm:w-96 bg-[#0B0F14] border border-[#2B3743] rounded-lg shadow-2xl p-4 z-50 text-left">
          <div className="flex items-center justify-between pb-2 border-b border-[#2B3743] mb-3">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-[#5B8FB9] animate-pulse" />
              <span className="font-extrabold text-sm text-[#E7EBEF]">CONNECT TO REMOTE SIM / DRONE</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[#707C88] hover:text-[#E7EBEF] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-[#A9B3BD] mb-3 leading-relaxed">
            Connect this GCS to your friend's laptop running Gazebo Sim or the physical drone companion computer over Wi-Fi / Hotspot.
          </p>

          {/* Current Connected Target */}
          <div className="bg-[#11171E] border border-[#2B3743] rounded p-2 mb-3">
            <div className="text-[10px] text-[#707C88] uppercase tracking-wider font-semibold">
              Current Active Endpoint:
            </div>
            <div className="text-[12px] font-mono font-bold text-[#4F9A72] truncate">
              {currentUrl}
            </div>
          </div>

          {/* Input for IP / URL */}
          <div className="space-y-1 mb-3">
            <label className="text-[11px] font-semibold text-[#A9B3BD] flex items-center space-x-1">
              <Globe className="w-3.5 h-3.5 text-[#5B8FB9]" />
              <span>Friend's IP / Remote Address:</span>
            </label>
            <div className="flex items-center space-x-1.5">
              <input
                type="text"
                value={endpointInput}
                onChange={(e) => setEndpointInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                placeholder="e.g. 192.168.1.50 or 10.152.0.x"
                className="flex-1 bg-[#151D26] border border-[#2B3743] rounded px-2.5 py-1.5 text-xs text-[#E7EBEF] font-mono focus:outline-none focus:border-[#5B8FB9]"
                autoFocus
              />
              <button
                onClick={() => handleConnect()}
                className="px-3 py-1.5 rounded bg-[#5B8FB9] hover:bg-[#4a779d] text-white font-bold text-xs transition flex items-center space-x-1 cursor-pointer shadow"
              >
                <Check className="w-3.5 h-3.5" />
                <span>CONNECT</span>
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center space-x-2 mb-3">
            <span className="text-[10px] text-[#707C88]">Quick Presets:</span>
            <button
              onClick={() => {
                setEndpointInput('ws://127.0.0.1:8765');
                handleConnect('ws://127.0.0.1:8765');
              }}
              className="px-2 py-0.5 text-[10px] bg-[#151D26] hover:bg-[#1f2b38] border border-[#2B3743] rounded text-[#A9B3BD] hover:text-[#E7EBEF] transition"
            >
              Localhost (127.0.0.1)
            </button>
          </div>

          {/* Friend Instructions Box */}
          <div className="bg-[#151D26]/80 border border-[#2B3743] rounded p-2.5 text-[10px] text-[#707C88] space-y-1">
            <div className="font-bold text-[#A9B3BD] flex items-center space-x-1">
              <span>📋 Instructions for Friend's Machine:</span>
            </div>
            <div>1. Connect both laptops to the same Wi-Fi / Hotspot.</div>
            <div>2. Friend gets his IP: <code className="text-[#5B8FB9]">hostname -I</code></div>
            <div>3. Friend runs SUTRA gateway: <code className="text-[#5B8FB9]">python3 start_gcs.py</code></div>
            <div>4. Enter his IP above and click CONNECT.</div>
          </div>
        </div>
      )}
    </div>
  );
};

