import React from 'react';
import { 
  Radio, 
  Compass, 
  ShieldCheck, 
  Cpu, 
  Activity, 
  Zap, 
  MapPin, 
  Sliders, 
  Trash2, 
  AlertTriangle,
  X
} from 'lucide-react';

import { useSelection } from '../hooks/useSelection';
import type { DroneAsset, Waypoint, TelemetryData } from '../../types';

interface RightInspectorProps {
  activeDrone: DroneAsset;
  telemetry: TelemetryData;
  waypoints: Waypoint[];
}

export const RightInspector: React.FC<RightInspectorProps> = ({
  activeDrone,
  telemetry,
  waypoints
}) => {
  const { selection, clear } = useSelection();

  return (
    <aside className="w-80 bg-[#080d1a] border-l border-[#1b253b] flex flex-col font-mono select-none overflow-hidden z-20 shrink-0">
      {/* INSPECTOR HEADER */}
      <div className="h-10 px-3 bg-[#0a1224] border-b border-slate-800 flex items-center justify-between">
        <span className="font-bold text-xs text-white tracking-wider uppercase flex items-center space-x-2">
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span>CONTEXT INSPECTOR ({selection.type})</span>
        </span>
        {selection.type !== 'NONE' && (
          <button onClick={clear} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* INSPECTOR BODY */}
      <div className="flex-1 p-3 overflow-y-auto space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-800">
        {/* DRONE INSPECTION VIEW */}
        {selection.type === 'DRONE' || selection.type === 'NONE' ? (
          <div className="space-y-3">
            <div className="bg-[#040710] border border-slate-800 p-3 rounded-lg space-y-2">
              <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                <span className="font-bold text-white text-sm">{activeDrone.callsign}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-800">
                  {activeDrone.status}
                </span>
              </div>
              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between"><span>System ID:</span><span className="text-cyan-400 font-mono">SYS_01</span></div>
                <div className="flex justify-between"><span>Coordinates:</span><span className="text-slate-200 font-mono">{activeDrone.lat.toFixed(4)}, {activeDrone.lng.toFixed(4)}</span></div>
                <div className="flex justify-between"><span>Altitude AGL:</span><span className="text-white font-bold">{telemetry.altitudeAGL} m</span></div>
                <div className="flex justify-between"><span>Ground Speed:</span><span className="text-white font-bold">{telemetry.groundSpeed} km/h</span></div>
                <div className="flex justify-between"><span>Attitude (P/R/Y):</span><span className="text-slate-300">{telemetry.pitch.toFixed(1)}° / {telemetry.roll.toFixed(1)}°</span></div>
                <div className="flex justify-between"><span>Battery Level:</span><span className="text-emerald-400 font-bold">{telemetry.batteryRemaining}% ({telemetry.batteryVoltage}V)</span></div>
                <div className="flex justify-between"><span>Satellites:</span><span className="text-emerald-400 font-bold">{telemetry.satellites} Sats</span></div>
              </div>
            </div>
          </div>
        ) : selection.type === 'MISSION' ? (
          /* MISSION INSPECTION VIEW */
          <div className="space-y-3">
            <div className="bg-[#040710] border border-slate-800 p-3 rounded-lg space-y-2">
              <span className="font-bold text-white text-sm block border-b border-slate-800 pb-1.5">MISSION METRICS</span>
              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between"><span>Total Waypoints:</span><span className="text-white font-bold">{waypoints.length}</span></div>
                <div className="flex justify-between"><span>Est. Battery Req:</span><span className="text-emerald-400 font-bold">18%</span></div>
                <div className="flex justify-between"><span>Risk Rating:</span><span className="text-emerald-400 font-bold">LOW</span></div>
              </div>
            </div>
          </div>
        ) : selection.type === 'GEOFENCE' ? (
          /* GEOFENCE INSPECTION VIEW */
          <div className="space-y-3">
            <div className="bg-[#040710] border border-slate-800 p-3 rounded-lg space-y-2">
              <span className="font-bold text-white text-sm block border-b border-slate-800 pb-1.5">GEOFENCE SAFETY ZONE</span>
              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between"><span>Zone Type:</span><span className="text-cyan-400 font-bold">KEEP_OUT POLYGON</span></div>
                <div className="flex justify-between"><span>Max Ceiling:</span><span className="text-amber-400 font-bold">120 m AGL</span></div>
                <div className="flex justify-between"><span>Status:</span><span className="text-emerald-400 font-bold">ACTIVE ENFORCED</span></div>
              </div>
            </div>
          </div>
        ) : (
          /* AI TARGET INSPECTION VIEW */
          <div className="space-y-3">
            <div className="bg-[#040710] border border-slate-800 p-3 rounded-lg space-y-2">
              <span className="font-bold text-white text-sm block border-b border-slate-800 pb-1.5">AI TRACKED TARGET</span>
              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between"><span>Target ID:</span><span className="text-purple-400 font-bold">TGT-101</span></div>
                <div className="flex justify-between"><span>Classification:</span><span className="text-white font-bold">VEHICLE</span></div>
                <div className="flex justify-between"><span>Confidence:</span><span className="text-emerald-400 font-bold">96%</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
