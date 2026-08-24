import React from 'react';
import { useAppStore } from '../../stores/appStore';
import { useCommunicationStore } from '../../stores/communicationStore';
import { wsClient } from '../../communication/WebSocketClient';
import { Settings, Save, RefreshCw } from 'lucide-react';

export const SettingsPanel: React.FC = () => {
  const { theme, units, mapStyle, setTheme, setUnits, setMapStyle } = useAppStore();
  const { wsUrl, setWsUrl } = useCommunicationStore();

  const handleSaveConnection = () => {
    wsClient.connect(wsUrl);
  };

  return (
    <div className="h-full flex flex-col space-y-4 p-4 overflow-y-auto font-mono text-xs select-none max-w-2xl">
      <div className="flex items-center space-x-2 font-bold text-sm text-cyan-300 border-b border-slate-800 pb-2">
        <Settings className="w-4 h-4" />
        <span>GCS SYSTEM CONFIGURATION & PREFERENCES</span>
      </div>

      {/* Network / WebSocket URL */}
      <div className="bg-[#0f141c]/90 border border-slate-800 rounded-lg p-3 space-y-2">
        <label className="text-[11px] font-bold text-slate-300">BACKEND WEBSOCKET GATEWAY URL</label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={wsUrl}
            onChange={(e) => setWsUrl(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:ring-1 focus:ring-cyan-400"
          />
          <button
            onClick={handleSaveConnection}
            className="px-3 py-1.5 rounded bg-cyan-950 border border-cyan-500/50 hover:bg-cyan-900 text-cyan-200 font-bold flex items-center space-x-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>CONNECT</span>
          </button>
        </div>
      </div>

      {/* Display & Map Style */}
      <div className="bg-[#0f141c]/90 border border-slate-800 rounded-lg p-3 space-y-3">
        <div className="text-[11px] font-bold text-slate-300">MAP & THEME PREFERENCES</div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">UNITS SYSTEM</label>
            <select
              value={units}
              onChange={(e) => setUnits(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs"
            >
              <option value="metric">Metric (m, m/s, km/h)</option>
              <option value="imperial">Imperial (ft, kts, mph)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1">MAP TACTICAL STYLE</label>
            <select
              value={mapStyle}
              onChange={(e) => setMapStyle(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs"
            >
              <option value="tactical-dark">Carto Dark Tactical</option>
              <option value="satellite">Satellite Imagery</option>
              <option value="terrain">Topographic Terrain</option>
            </select>
          </div>
        </div>
      </div>

      {/* Authoritative Notice */}
      <div className="bg-slate-900/60 p-3 rounded border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
        <strong>ARCHITECTURE PRINCIPLE:</strong> Python Backend is the authoritative system for all
        kinematics, MAVLink routing, mission engines, geofence validations, and AI decisions. React GCS
        serves strictly as the high-performance presentation and interaction surface.
      </div>
    </div>
  );
};
