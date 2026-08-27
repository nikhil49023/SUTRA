import React from 'react';
import { useAppStore } from '../../stores/appStore';
import { Sliders, Database, Shield, Activity, Map, RefreshCw } from 'lucide-react';
import { MapStyleType } from '../../types/app';

export const SettingsPanel: React.FC = () => {
  const { theme, units, mapStyle, mapStyleLoading, setTheme, setUnits, setMapStyle } = useAppStore();

  return (
    <div className="h-full flex flex-col space-y-4 p-4 max-w-2xl mx-auto overflow-y-auto font-mono text-xs select-none">
      <div className="flex items-center space-x-2 border-b border-[#2B3743] pb-3">
        <Sliders className="w-5 h-5 text-[#5B8FB9]" />
        <h2 className="text-base font-bold text-[#E7EBEF] tracking-wide">SYSTEM SETTINGS & ENVIRONMENT</h2>
      </div>

      {/* Presentation Options */}
      <div className="bg-[#11171E]/90 border border-[#2B3743] rounded-lg p-3 space-y-3">
        <div className="flex items-center space-x-2 font-bold text-[#E7EBEF] border-b border-[#2B3743] pb-2">
          <Activity className="w-4 h-4 text-[#5B8FB9]" />
          <span>DISPLAY & UNITS PREFERENCES</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-[#707C88] block mb-1">COLOR THEME</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as any)}
              className="w-full bg-[#0B0F14] border border-[#2B3743] rounded px-2.5 py-1.5 text-[#E7EBEF] text-xs font-mono focus:border-[#5B8FB9] outline-none"
            >
              <option value="dark-tactical">Dark Tactical (Graphite & Steel)</option>
              <option value="high-contrast">High-Contrast Tactical</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-[#707C88] block mb-1">MEASUREMENT UNITS</label>
            <select
              value={units}
              onChange={(e) => setUnits(e.target.value as any)}
              className="w-full bg-[#0B0F14] border border-[#2B3743] rounded px-2.5 py-1.5 text-[#E7EBEF] text-xs font-mono focus:border-[#5B8FB9] outline-none"
            >
              <option value="metric">Metric (m, m/s, km/h)</option>
              <option value="imperial">Imperial (ft, kts, mph)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-[#707C88] flex items-center gap-1">
                <Map className="w-3 h-3 text-[#5B8FB9]" />
                <span>MAP TACTICAL BASEMAP STYLE</span>
              </label>
              {mapStyleLoading && (
                <span className="text-[10px] text-[#C49A4A] flex items-center gap-1 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>LOADING TILES...</span>
                </span>
              )}
            </div>
            <select
              value={mapStyle}
              onChange={(e) => setMapStyle(e.target.value as MapStyleType)}
              className="w-full bg-[#0B0F14] border border-[#2B3743] rounded px-2.5 py-1.5 text-[#E7EBEF] text-xs font-mono focus:border-[#5B8FB9] outline-none"
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
      <div className="bg-[#11171E]/60 p-3 rounded-lg border border-[#2B3743] text-[11px] text-[#707C88] leading-relaxed">
        <strong className="text-[#A9B3BD]">ARCHITECTURE PRINCIPLE:</strong> Python Backend is the authoritative system for all
        kinematics, MAVLink routing, mission engines, geofence validations, and AI decisions. React GCS
        serves strictly as the high-performance presentation and interaction surface.
      </div>
    </div>
  );
};
