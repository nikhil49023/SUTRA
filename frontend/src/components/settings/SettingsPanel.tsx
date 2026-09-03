import React from 'react';
import { useAppStore } from '../../stores/appStore';
import { Sliders, Activity, Map, RefreshCw, ShieldCheck } from 'lucide-react';
import { MapStyleType } from '../../types/app';

export const SettingsPanel: React.FC = () => {
  const { theme, units, mapStyle, mapStyleLoading, setTheme, setUnits, setMapStyle } = useAppStore();

  return (
    <div className="h-full w-full overflow-y-auto p-3 sm:p-4 md:p-6 custom-scrollbar font-mono text-xs select-none">
      <div className="max-w-4xl mx-auto flex flex-col space-y-4">
        {/* Presentation Options */}
        <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-4 space-y-4">
          <div className="flex items-center space-x-2 font-bold text-[#E7EBEF] border-b border-[#2B3743] pb-2.5">
            <Activity className="w-4 h-4 text-[#5B8FB9]" />
            <span className="text-sm">DISPLAY & UNITS PREFERENCES</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-[#707C88] font-bold block mb-1.5 uppercase">Color Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="w-full bg-[#151D26] border border-[#2B3743] rounded px-3 py-2 text-[#E7EBEF] text-xs font-mono focus:border-[#5B8FB9] outline-none"
              >
                <option value="dark-tactical">Dark Tactical (Graphite & Steel)</option>
                <option value="high-contrast">High-Contrast Tactical</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-[#707C88] font-bold block mb-1.5 uppercase">Measurement Units</label>
              <select
                value={units}
                onChange={(e) => setUnits(e.target.value as any)}
                className="w-full bg-[#151D26] border border-[#2B3743] rounded px-3 py-2 text-[#E7EBEF] text-xs font-mono focus:border-[#5B8FB9] outline-none"
              >
                <option value="metric">Metric (m, m/s, km/h)</option>
                <option value="imperial">Imperial (ft, kts, mph)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] text-[#707C88] font-bold flex items-center gap-1.5 uppercase">
                  <Map className="w-3.5 h-3.5 text-[#5B8FB9]" />
                  <span>Map Tactical Basemap Style</span>
                </label>
                {mapStyleLoading && (
                  <span className="text-[10px] text-[#C49A4A] flex items-center gap-1 animate-pulse font-bold">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>LOADING TILES...</span>
                  </span>
                )}
              </div>
              <select
                value={mapStyle}
                onChange={(e) => setMapStyle(e.target.value as MapStyleType)}
                className="w-full bg-[#151D26] border border-[#2B3743] rounded px-3 py-2 text-[#E7EBEF] text-xs font-mono focus:border-[#5B8FB9] outline-none"
              >
                <option value="tactical-dark">Carto Dark Tactical</option>
                <option value="satellite">Esri World Satellite Imagery</option>
                <option value="terrain">Topographic Elevation & Terrain</option>
                <option value="streets">Tactical Street Map</option>
              </select>
            </div>
          </div>
        </div>

        {/* Architecture Notice */}
        <div className="bg-[#11171E] p-4 rounded-lg border border-[#2B3743] text-[11px] text-[#707C88] leading-relaxed space-y-1">
          <div className="flex items-center space-x-1.5 text-[#5B8FB9] font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>AUTHORITATIVE BACKEND PRINCIPLE</span>
          </div>
          <p>
            The Python Backend is the authoritative source of truth for all flight kinematics, MAVLink v2 routing,
            waypoint state machines, geofence compliance, and AI SAR target tracking. The React Tactical GCS frontend
            operates as a high-frequency (60 FPS) rendering and command dispatch interface.
          </p>
        </div>
      </div>
    </div>
  );
};
