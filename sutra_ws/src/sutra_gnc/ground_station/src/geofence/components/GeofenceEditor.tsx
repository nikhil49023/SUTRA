// Geofence Editor Component
import React from "react";
import {
  X,
  Sliders,
  Shield,
  AlertTriangle,
  ShieldCheck,
  Tag,
  Maximize2,
  Minimize2,
  Lock,
  Eye,
  EyeOff,
  Palette,
  Check
} from "lucide-react";

import { geofenceStore } from "../store/GeofenceStore";
import { GeofenceService } from "../services/GeofenceService";
import { GeofenceController } from "../controllers/GeofenceController";
import { ZoneType, type GeofenceFeature } from "../types/GeofenceTypes";

export default function GeofenceEditor() {
  const [state, setState] = React.useState(geofenceStore.getState());

  React.useEffect(() => {
    return geofenceStore.subscribe(setState);
  }, []);

  if (!state.selection.selectedGeofenceId) return null;

  const feature = state.collection.features.find(
    (f: GeofenceFeature) =>
      f.properties.id === state.selection.selectedGeofenceId
  );

  if (!feature) return null;

  const activeType = feature.properties.type;

  return (
    <div className="absolute left-4 bottom-4 w-72 rounded-xl border border-[#1b253b] bg-[#070c18]/95 backdrop-blur-xl shadow-2xl z-40 p-3 font-mono text-xs text-slate-200 select-none animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* PANEL HEADER */}
      <div className="flex items-center justify-between border-b border-[#1b253b] pb-2 mb-3">
        <div className="flex items-center gap-2">
          <Sliders size={14} className="text-cyan-400" />
          <h2 className="text-white font-bold tracking-wider uppercase text-[11px]">
            GEOFENCE EDITOR
          </h2>
        </div>
        <button
          onClick={() => GeofenceController.selectGeofence(null)}
          className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
          title="Close Editor"
        >
          <X size={12} />
        </button>
      </div>

      {/* BODY CONTENT */}
      <div className="space-y-3">
        {/* NAME INPUT */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
            <span>NAME</span>
          </label>
          <input
            className="w-full rounded bg-[#0d172a] border border-slate-800 px-2 py-1 text-white font-semibold text-xs focus:outline-none focus:border-cyan-500 transition-colors"
            value={feature.properties.name}
            onChange={(e) =>
              GeofenceService.rename(feature.properties.id, e.target.value)
            }
          />
        </div>

        {/* TYPE DROPDOWN */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            TYPE
          </label>
          <select
            value={activeType}
            onChange={(e) => GeofenceService.changeType(feature.properties.id, e.target.value as ZoneType)}
            className="w-full bg-[#0d172a] border border-slate-800 rounded px-2 py-1 text-white font-semibold text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value={ZoneType.NO_FLY}>No Fly Zone</option>
            <option value={ZoneType.WARNING}>Warning Zone</option>
            <option value={ZoneType.SAFE}>Safe Zone</option>
            <option value={ZoneType.CORRIDOR}>Corridor</option>
          </select>
        </div>

        {/* ALTITUDE INPUTS (MIN / MAX) */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            ALTITUDE (M)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[9px] text-slate-500">Min</span>
              <input
                type="number"
                value={feature.properties.altitudeMin}
                onChange={(e) => GeofenceService.updateAltitude(feature.properties.id, Number(e.target.value), feature.properties.altitudeMax)}
                className="w-full bg-[#0d172a] border border-slate-800 rounded px-2 py-1 text-white text-xs font-mono"
              />
            </div>
            <div>
              <span className="text-[9px] text-slate-500">Max</span>
              <input
                type="number"
                value={feature.properties.altitudeMax}
                onChange={(e) => GeofenceService.updateAltitude(feature.properties.id, feature.properties.altitudeMin, Number(e.target.value))}
                className="w-full bg-[#0d172a] border border-slate-800 rounded px-2 py-1 text-white text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* COLOR PICKER */}
        <div className="flex items-center justify-between pt-1 border-t border-[#1b253b]">
          <span className="text-[10px] text-slate-400 font-bold uppercase">COLOR</span>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={feature.properties.color || "#ef4444"}
              onChange={(e) => {
                feature.properties.color = e.target.value;
                geofenceStore.notify();
              }}
              className="w-6 h-6 rounded bg-transparent cursor-pointer border-0"
            />
            <span className="text-[10px] text-slate-300 uppercase font-mono">
              {feature.properties.color || "#ef4444"}
            </span>
          </div>
        </div>

        {/* TOGGLES: LOCKED & VISIBLE */}
        <div className="space-y-2 pt-2 border-t border-[#1b253b]">
          {/* LOCKED */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
              <Lock size={12} className="text-slate-400" />
              <span>LOCKED</span>
            </span>
            <button
              onClick={() => GeofenceService.toggleLock(feature.properties.id)}
              className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                feature.properties.locked ? "bg-cyan-500" : "bg-slate-800"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  feature.properties.locked ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* VISIBLE */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
              {feature.properties.visible ? <Eye size={12} className="text-emerald-400" /> : <EyeOff size={12} className="text-slate-500" />}
              <span>VISIBLE</span>
            </span>
            <button
              onClick={() => GeofenceService.toggleVisibility(feature.properties.id)}
              className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                feature.properties.visible ? "bg-emerald-500" : "bg-slate-800"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  feature.properties.visible ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
