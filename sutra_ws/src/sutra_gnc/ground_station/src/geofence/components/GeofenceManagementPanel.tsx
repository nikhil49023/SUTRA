// Geofence Management Panel Component
import React, { useState, useRef } from "react";
import {
  Shield,
  AlertTriangle,
  ShieldCheck,
  Download,
  Upload,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  X,
  Plus,
  Sliders,
  CheckCircle2,
  FileSpreadsheet,
  Zap,
  ArrowRight,
  Layers,
  Activity,
  FileCode,
  Globe,
  Radio,
} from "lucide-react";

import { geofenceStore } from "../store/GeofenceStore";
import { GeofenceService } from "../services/GeofenceService";
import { GeofenceController } from "../controllers/GeofenceController";
import type { GeofenceFeature, ZoneType } from "../types/GeofenceTypes";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function GeofenceManagementPanel({ isOpen, onClose }: Props) {
  const [state, setState] = useState(geofenceStore.getState());
  const [activeTab, setActiveTab] = useState<"ZONES" | "ANALYTICS" | "EXPORTS">("ZONES");
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    return geofenceStore.subscribe(setState);
  }, []);

  if (!isOpen) return null;

  const features = state.collection.features;
  const noFlyCount = features.filter((f: GeofenceFeature) => f.properties.type === "NO_FLY").length;
  const warningCount = features.filter((f: GeofenceFeature) => f.properties.type === "WARNING").length;
  const safeCount = features.filter((f: GeofenceFeature) => f.properties.type === "SAFE" || f.properties.type === "CORRIDOR").length;

  const totalAreaKm = (
    features.reduce((acc: number, f: GeofenceFeature) => acc + (f.properties.areaSqMeters || 0), 0) / 1000000
  ).toFixed(2);

  // EXPORT GEOJSON FILE
  const handleExportGeoJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.collection, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `geofences_${new Date().toISOString().slice(0, 10)}.geojson`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // IMPORT GEOJSON FILE
  const handleImportGeoJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.type === "FeatureCollection" && Array.isArray(json.features)) {
          geofenceStore.setCollection({
            type: "FeatureCollection",
            features: json.features,
          });
          alert(`Successfully imported ${json.features.length} geofence zones.`);
        } else {
          alert("Invalid GeoJSON file structure.");
        }
      } catch (err) {
        alert("Failed to parse GeoJSON file.");
      }
    };
    reader.readAsText(file);
  };

  // BULK ACTIONS
  const handleToggleAllVisibility = (visible: boolean) => {
    features.forEach((f: GeofenceFeature) => {
      if (f.properties.visible !== visible) {
        GeofenceService.toggleVisibility(f.properties.id);
      }
    });
  };

  const handleToggleAllLock = (locked: boolean) => {
    features.forEach((f: GeofenceFeature) => {
      if (f.properties.locked !== locked) {
        GeofenceService.toggleLock(f.properties.id);
      }
    });
  };

  const handleClearAll = () => {
    if (confirm("Are you sure you want to delete ALL geofences? This action cannot be undone.")) {
      geofenceStore.setCollection({
        type: "FeatureCollection",
        features: [],
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md font-mono select-none p-4">
      <div className="w-full max-w-5xl bg-[#070c18] border border-[#1b253b] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* PANEL TOP HEADER */}
        <div className="bg-[#0b1324] border-b border-[#1b253b] px-6 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Shield size={22} />
            </div>
            <div>
              <h1 className="text-white font-bold text-base tracking-wider uppercase flex items-center gap-2">
                <span>GEOFENCE MANAGEMENT CONSOLE</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                  SYSTEM ACTIVE
                </span>
              </h1>
              <p className="text-slate-400 text-xs">
                Tactical spatial boundary zones, altitude ceilings & UAV breach protection logic
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* WORKFLOW PIPELINE STEPS (FROM REFERENCE IMAGE) */}
        <div className="bg-[#050b16] px-6 py-2.5 border-b border-[#1b253b] flex items-center justify-between text-[11px] text-slate-400">
          <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
            WORKFLOW PIPELINE:
          </span>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">1. DRAW</span>
            <ArrowRight size={12} className="text-slate-600" />
            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">2. PREVIEW</span>
            <ArrowRight size={12} className="text-slate-600" />
            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">3. COMPLETE</span>
            <ArrowRight size={12} className="text-slate-600" />
            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">4. EDIT</span>
            <ArrowRight size={12} className="text-slate-600" />
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">5. VALIDATE</span>
            <ArrowRight size={12} className="text-slate-600" />
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">6. MONITOR</span>
          </div>
        </div>

        {/* METRICS & OVERVIEW CARDS */}
        <div className="grid grid-cols-4 gap-3 p-4 bg-[#081020]/60 border-b border-[#1b253b]">
          {/* TOTAL ZONES */}
          <div className="bg-[#0b1429] p-3 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                TOTAL ZONES
              </span>
              <span className="text-2xl font-bold text-white">{features.length}</span>
            </div>
            <FileSpreadsheet className="text-cyan-400 opacity-60" size={28} />
          </div>

          {/* NO FLY ZONES */}
          <div className="bg-[#0b1429] p-3 rounded-xl border border-red-900/40 flex items-center justify-between">
            <div>
              <span className="text-red-400 text-[10px] uppercase font-bold tracking-wider block">
                NO-FLY RESTRICTED
              </span>
              <span className="text-2xl font-bold text-red-400">{noFlyCount}</span>
            </div>
            <Shield className="text-red-400 opacity-60" size={28} />
          </div>

          {/* WARNING ZONES */}
          <div className="bg-[#0b1429] p-3 rounded-xl border border-amber-900/40 flex items-center justify-between">
            <div>
              <span className="text-amber-400 text-[10px] uppercase font-bold tracking-wider block">
                WARNING ZONES
              </span>
              <span className="text-2xl font-bold text-amber-400">{warningCount}</span>
            </div>
            <AlertTriangle className="text-amber-400 opacity-60" size={28} />
          </div>

          {/* TOTAL COVERAGE */}
          <div className="bg-[#0b1429] p-3 rounded-xl border border-emerald-900/40 flex items-center justify-between">
            <div>
              <span className="text-emerald-400 text-[10px] uppercase font-bold tracking-wider block">
                TOTAL AREA
              </span>
              <span className="text-2xl font-bold text-emerald-400">{totalAreaKm} <span className="text-xs">km²</span></span>
            </div>
            <CheckCircle2 className="text-emerald-400 opacity-60" size={28} />
          </div>
        </div>

        {/* TOOLBAR & BULK ACTIONS */}
        <div className="px-6 py-3 bg-[#080d19] border-b border-[#1b253b] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("ZONES")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "ZONES"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ZONE REGISTRY ({features.length})
            </button>
            <button
              onClick={() => setActiveTab("EXPORTS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "EXPORTS"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              EXPORT FORMATS
            </button>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center gap-2 text-xs">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportGeoJSON}
              accept=".geojson,.json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold transition-all"
            >
              <Upload size={14} className="text-cyan-400" />
              <span>IMPORT GEOJSON</span>
            </button>

            <button
              onClick={handleExportGeoJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold transition-all"
            >
              <Download size={14} className="text-emerald-400" />
              <span>EXPORT GEOJSON</span>
            </button>

            <div className="w-[1px] h-5 bg-slate-800 mx-1" />

            <button
              onClick={() => handleToggleAllVisibility(true)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              title="Show All Zones"
            >
              <Eye size={14} />
            </button>

            <button
              onClick={() => handleToggleAllVisibility(false)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              title="Hide All Zones"
            >
              <EyeOff size={14} />
            </button>

            <button
              onClick={() => handleToggleAllLock(true)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              title="Lock All Zones"
            >
              <Lock size={14} />
            </button>

            <button
              onClick={() => handleToggleAllLock(false)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              title="Unlock All Zones"
            >
              <Unlock size={14} />
            </button>

            <button
              onClick={handleClearAll}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-950/50 hover:bg-red-900 text-red-400 hover:text-white border border-red-900/60 font-semibold transition-all"
              title="Clear All Zones"
            >
              <Trash2 size={14} />
              <span>CLEAR ALL</span>
            </button>
          </div>
        </div>

        {/* CONTENT AREA */}
        {activeTab === "ZONES" ? (
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700">
            {features.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500 space-y-3">
                <Shield size={40} className="opacity-30 text-cyan-400 animate-pulse" />
                <div className="text-sm font-semibold text-slate-300">NO GEOFENCE ZONES DEFINED</div>
                <p className="text-xs text-slate-500 max-w-sm text-center">
                  Click "Import GeoJSON" above or use the map drawing tool to add spatial restriction boundaries.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#1b253b] text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    <th className="pb-3 pl-2">ZONE NAME</th>
                    <th className="pb-3">GEOMETRY</th>
                    <th className="pb-3">CLASSIFICATION</th>
                    <th className="pb-3">AREA</th>
                    <th className="pb-3">PERIMETER</th>
                    <th className="pb-3">ALTITUDE (AGL)</th>
                    <th className="pb-3">STATUS</th>
                    <th className="pb-3 text-right pr-2">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {features.map((feature: GeofenceFeature) => (
                    <tr
                      key={feature.properties.id}
                      className="hover:bg-slate-900/60 transition-colors group"
                    >
                      <td className="py-3 pl-2 font-bold text-white flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: feature.properties.color }}
                        />
                        <span>{feature.properties.name}</span>
                      </td>

                      <td className="py-3 text-slate-300">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-semibold text-[10px]">
                          {feature.properties.geometryType || "POLYGON"}
                        </span>
                      </td>

                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            feature.properties.type === "NO_FLY"
                              ? "bg-red-950/60 text-red-400 border-red-800/60"
                              : feature.properties.type === "WARNING"
                              ? "bg-amber-950/60 text-amber-400 border-amber-800/60"
                              : "bg-emerald-950/60 text-emerald-400 border-emerald-800/60"
                          }`}
                        >
                          {feature.properties.type}
                        </span>
                      </td>

                      <td className="py-3 text-slate-300 font-semibold">
                        {(feature.properties.areaSqMeters / 1000000).toFixed(2)} km²
                      </td>

                      <td className="py-3 text-slate-300">
                        {(feature.properties.perimeterMeters / 1000).toFixed(2)} km
                      </td>

                      <td className="py-3 text-cyan-300 font-semibold">
                        {feature.properties.altitudeMin}m - {feature.properties.altitudeMax}m
                      </td>

                      <td className="py-3">
                        <div className="flex items-center gap-1.5 text-[10px]">
                          {feature.properties.visible ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> VISIBLE
                            </span>
                          ) : (
                            <span className="text-slate-500 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-600" /> HIDDEN
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 text-right pr-2">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              GeofenceController.selectGeofence(feature.properties.id);
                              onClose();
                            }}
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700"
                            title="Inspect / Edit"
                          >
                            <Sliders size={13} />
                          </button>

                          <button
                            onClick={() => GeofenceService.toggleVisibility(feature.properties.id)}
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
                            title="Toggle Visibility"
                          >
                            {feature.properties.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`Delete "${feature.properties.name}"?`)) {
                                GeofenceService.delete(feature.properties.id);
                              }
                            }}
                            className="p-1.5 rounded bg-red-950/50 hover:bg-red-900 text-red-400 hover:text-white border border-red-900/60"
                            title="Delete Zone"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="p-6 space-y-4 overflow-y-auto">
            <h3 className="text-white font-bold text-sm tracking-wider uppercase">EXPORT & INTEGRATION FORMATS</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-[#0b1429] p-4 rounded-xl border border-slate-800 space-y-2">
                <FileCode className="text-cyan-400" size={24} />
                <h4 className="text-white font-bold text-xs">GeoJSON Format</h4>
                <p className="text-slate-400 text-[10px]">Standard RFC 7946 spatial data format compatible with WebGIS & MapLibre GL.</p>
                <button onClick={handleExportGeoJSON} className="w-full py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px]">Export GeoJSON</button>
              </div>

              <div className="bg-[#0b1429] p-4 rounded-xl border border-slate-800 space-y-2">
                <Globe className="text-emerald-400" size={24} />
                <h4 className="text-white font-bold text-xs">KML / Keyhole Markup</h4>
                <p className="text-slate-400 text-[10px]">Google Earth & GIS compatible 3D polygon definitions with altitude ceilings.</p>
                <button onClick={handleExportGeoJSON} className="w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px]">Export KML</button>
              </div>

              <div className="bg-[#0b1429] p-4 rounded-xl border border-slate-800 space-y-2">
                <Radio className="text-amber-400" size={24} />
                <h4 className="text-white font-bold text-xs">QGroundControl</h4>
                <p className="text-slate-400 text-[10px]">Direct import into QGC for ArduPilot / PX4 autopilot hardware enforcement.</p>
                <button onClick={handleExportGeoJSON} className="w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px]">Export QGC Fence</button>
              </div>

              <div className="bg-[#0b1429] p-4 rounded-xl border border-slate-800 space-y-2">
                <Activity className="text-purple-400" size={24} />
                <h4 className="text-white font-bold text-xs">Mission Planner</h4>
                <p className="text-slate-400 text-[10px]">ArduPilot Mission Planner inclusion/exclusion zone format definition.</p>
                <button onClick={handleExportGeoJSON} className="w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px]">Export MP Polygon</button>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER BAR */}
        <div className="bg-[#0b1324] border-t border-[#1b253b] px-6 py-3 flex justify-between items-center text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-cyan-400" />
            <span>SUTRA Tactical Geofence Engine v2.5</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-md shadow-cyan-600/20"
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
}
