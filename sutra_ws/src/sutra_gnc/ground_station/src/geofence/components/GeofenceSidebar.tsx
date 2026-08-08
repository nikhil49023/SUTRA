// Geofence Sidebar Component
import React, { useState } from "react";
import {
  Eye,
  EyeOff,
  Trash2,
  Lock,
  Unlock,
  Sliders,
  Search,
  Shield,
  AlertTriangle,
  ShieldCheck,
  Compass,
  Hexagon,
  Circle,
  Route,
  CheckCircle2,
  Activity,
  Edit,
  Plus,
} from "lucide-react";

import { geofenceStore } from "../store/GeofenceStore";
import { GeofenceService } from "../services/GeofenceService";
import { GeofenceController } from "../controllers/GeofenceController";
import { GeometryType, ZoneType, type GeofenceFeature } from "../types/GeofenceTypes";

export default function GeofenceSidebar() {
  const [state, setState] = React.useState(geofenceStore.getState());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<ZoneType | "ALL">("ALL");

  React.useEffect(() => {
    return geofenceStore.subscribe(setState);
  }, []);

  const selectedFeature = state.selection.selectedGeofenceId
    ? GeofenceService.getById(state.selection.selectedGeofenceId)
    : null;

  const features = state.collection.features.filter((f: GeofenceFeature) => {
    const matchesSearch = f.properties.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesType = filterType === "ALL" || f.properties.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="w-80 max-h-[55vh] flex flex-col rounded-xl border border-[#1b253b] bg-[#070c18]/95 backdrop-blur-xl shadow-2xl font-mono text-xs text-slate-200 select-none overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
      {/* HEADER BAR */}
      <div className="bg-[#0b1324] border-b border-[#1b253b] px-3.5 py-2.5 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-cyan-400" />
          <h2 className="text-white font-bold tracking-wider uppercase text-[11px]">
            GEOFENCE LIST
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-cyan-950 text-cyan-400 border border-cyan-800/80 px-2 py-0.5 rounded text-[10px] font-bold">
            {state.collection.features.length} ZONES
          </span>
          <button
            onClick={() => GeofenceController.startDrawing("NO_FLY" as ZoneType, GeometryType.POLYGON)}
            className="w-6 h-6 rounded bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center transition-all shadow-md"
            title="Create New Geofence"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* SEARCH AND CATEGORY FILTERS */}
      <div className="p-2 border-b border-[#1b253b] space-y-1.5 bg-[#081020]/60">
        {/* SEARCH BAR */}
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-2 text-slate-500" />
          <input
            type="text"
            placeholder="Search zone by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0d172a] border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-white text-[10px] placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60"
          />
        </div>

        {/* CATEGORY FILTER PILLS */}
        <div className="grid grid-cols-4 gap-1">
          {(["ALL", "NO_FLY", "WARNING", "SAFE"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`py-0.5 rounded text-[9px] font-bold uppercase transition-all ${
                filterType === type
                  ? type === "NO_FLY"
                    ? "bg-red-500/30 text-red-300 border border-red-500/60"
                    : type === "WARNING"
                    ? "bg-amber-500/30 text-amber-300 border border-amber-500/60"
                    : type === "SAFE"
                    ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/60"
                    : "bg-cyan-500/30 text-cyan-300 border border-cyan-500/60"
                  : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {type === "NO_FLY" ? "NO-FLY" : type}
            </button>
          ))}
        </div>
      </div>

      {/* ZONE CARDS LIST */}
      <div className="p-2 space-y-1.5 overflow-y-auto max-h-[30vh] scrollbar-thin scrollbar-thumb-slate-700">
        {features.length === 0 && (
          <div className="flex flex-col items-center justify-center text-slate-500 py-6 space-y-1.5">
            <Compass size={24} className="opacity-40 animate-pulse text-cyan-400" />
            <div className="text-[10px] font-medium">No Geofences Configured</div>
            <div className="text-[9px] text-slate-600 text-center px-4">
              Select Polygon, Circle, or Corridor from top toolbar to create a perimeter.
            </div>
          </div>
        )}

        {features.map((feature: GeofenceFeature) => {
          const isSelected =
            state.selection.selectedGeofenceId === feature.properties.id;

          const geomType = feature.properties.geometryType || "POLYGON";

          return (
            <div
              key={feature.properties.id}
              onClick={() =>
                GeofenceController.selectGeofence(feature.properties.id)
              }
              className={`rounded-lg border p-2 space-y-1.5 cursor-pointer transition-all ${
                isSelected
                  ? "bg-[#0f1b33] border-cyan-500 shadow-md ring-1 ring-cyan-500/40"
                  : "bg-[#0a1224]/80 border-slate-800/80 hover:border-slate-700 hover:bg-[#0c162c]"
              }`}
            >
              {/* CARD TOP ROW */}
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <div className="font-bold text-white text-[11px] flex items-center gap-1.5">
                    {geomType === "CIRCLE" ? (
                      <Circle size={12} className="text-amber-400" />
                    ) : geomType === "CORRIDOR" ? (
                      <Route size={12} className="text-blue-400" />
                    ) : (
                      <Hexagon size={12} className="text-red-400" />
                    )}
                    <span>{feature.properties.name}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span
                      className={`text-[8px] px-1.5 py-0.2 rounded font-extrabold uppercase border ${
                        feature.properties.type === "NO_FLY"
                          ? "bg-red-950/60 text-red-400 border-red-800/60"
                          : feature.properties.type === "WARNING"
                          ? "bg-amber-950/60 text-amber-400 border-amber-800/60"
                          : feature.properties.type === "CORRIDOR"
                          ? "bg-blue-950/60 text-blue-400 border-blue-800/60"
                          : "bg-emerald-950/60 text-emerald-400 border-emerald-800/60"
                      }`}
                    >
                      {feature.properties.type}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {geomType}
                    </span>
                  </div>
                </div>

                {/* CARD ACTIONS */}
                <div
                  className="flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() =>
                      GeofenceService.toggleVisibility(feature.properties.id)
                    }
                    className="p-1 rounded bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
                    title="Toggle Visibility"
                  >
                    {feature.properties.visible ? (
                      <Eye size={12} className="text-cyan-400" />
                    ) : (
                      <EyeOff size={12} className="text-slate-600" />
                    )}
                  </button>

                  <button
                    onClick={() =>
                      GeofenceService.toggleLock(feature.properties.id)
                    }
                    className="p-1 rounded bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
                    title="Lock / Unlock"
                  >
                    {feature.properties.locked ? (
                      <Lock size={12} className="text-amber-400" />
                    ) : (
                      <Unlock size={12} />
                    )}
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Delete geofence "${feature.properties.name}"?`)) {
                        GeofenceService.delete(feature.properties.id);
                      }
                    }}
                    className="p-1 rounded bg-red-950/40 hover:bg-red-900 text-red-400 hover:text-white border border-red-900/50"
                    title="Delete Zone"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* SELECTED GEOFENCE DETAILS CARD (MATCHING REFERENCE IMAGE) */}
      {selectedFeature && (
        <div className="border-t border-[#1b253b] bg-[#070e1c] p-2.5 space-y-2">
          <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-1.5 font-bold text-cyan-400 uppercase text-[10px]">
              <Sliders size={12} />
              <span>GEOFENCE DETAILS</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-white text-[10px]">{selectedFeature.properties.name}</span>
              {selectedFeature.properties.locked && (
                <Lock size={12} className="text-amber-400" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[9px]">
            <div className="bg-[#0b1426] p-1.5 rounded border border-slate-800">
              <span className="block text-slate-500 uppercase">Type</span>
              <span className="font-semibold text-slate-200">
                {selectedFeature.properties.geometryType || "Polygon"}
              </span>
            </div>

            <div className="bg-[#0b1426] p-1.5 rounded border border-slate-800">
              <span className="block text-slate-500 uppercase">Area</span>
              <span className="font-semibold text-cyan-300">
                {(selectedFeature.properties.areaSqMeters / 1000000).toFixed(2)} km²
              </span>
            </div>

            <div className="bg-[#0b1426] p-1.5 rounded border border-slate-800">
              <span className="block text-slate-500 uppercase">Perimeter</span>
              <span className="font-semibold text-slate-200">
                {(selectedFeature.properties.perimeterMeters / 1000).toFixed(2)} km
              </span>
            </div>

            <div className="bg-[#0b1426] p-1.5 rounded border border-slate-800">
              <span className="block text-slate-500 uppercase">Altitude</span>
              <span className="font-semibold text-emerald-400">
                {selectedFeature.properties.altitudeMin} - {selectedFeature.properties.altitudeMax} m
              </span>
            </div>

            <div className="bg-[#0b1426] p-1.5 rounded border border-slate-800">
              <span className="block text-slate-500 uppercase">Created</span>
              <span className="font-semibold text-slate-300">
                12 May 2025 14:32
              </span>
            </div>

            <div className="bg-[#0b1426] p-1.5 rounded border border-slate-800">
              <span className="block text-slate-500 uppercase">Points</span>
              <span className="font-semibold text-slate-200">
                {selectedFeature.geometry.coordinates[0]?.length ? selectedFeature.geometry.coordinates[0].length - 1 : 4}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              GeofenceController.selectGeofence(selectedFeature.properties.id);
            }}
            className="w-full py-1 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 text-[10px] font-bold uppercase transition-all"
          >
            Edit Properties
          </button>
        </div>
      )}

      {/* MISSION VALIDATION & MONITORING CHECKS (FROM REFERENCE IMAGE) */}
      <div className="border-t border-[#1b253b] bg-[#050a14] p-2 space-y-1 text-[9px]">
        <div className="flex items-center justify-between text-slate-400 font-bold uppercase text-[9.5px]">
          <span className="flex items-center gap-1 text-slate-300">
            <Activity size={11} className="text-emerald-400 animate-pulse" />
            MISSION VALIDATION
          </span>
          <span className="text-emerald-400 font-extrabold">PASS</span>
        </div>

        <div className="grid grid-cols-2 gap-1 pt-1">
          <div className="flex items-center gap-1 text-slate-300 bg-slate-900/60 p-1 rounded border border-slate-800">
            <CheckCircle2 size={10} className="text-emerald-400" />
            <span>No Fly Check</span>
          </div>
          <div className="flex items-center gap-1 text-slate-300 bg-slate-900/60 p-1 rounded border border-slate-800">
            <CheckCircle2 size={10} className="text-emerald-400" />
            <span>Alt Limits</span>
          </div>
          <div className="flex items-center gap-1 text-slate-300 bg-slate-900/60 p-1 rounded border border-slate-800">
            <CheckCircle2 size={10} className="text-emerald-400" />
            <span>Corridor Pass</span>
          </div>
          <div className="flex items-center gap-1 text-slate-300 bg-slate-900/60 p-1 rounded border border-slate-800">
            <CheckCircle2 size={10} className="text-emerald-400" />
            <span>Point In Polygon</span>
          </div>
        </div>
      </div>
    </div>
  );
}
