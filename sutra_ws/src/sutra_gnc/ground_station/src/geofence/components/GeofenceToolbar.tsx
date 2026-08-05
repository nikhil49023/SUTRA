// Geofence Toolbar Component
import React from "react";
import {
  Undo2,
  X,
  Check,
  Shield,
  AlertTriangle,
  ShieldCheck,
  MousePointerClick,
  SlidersHorizontal,
  Circle,
  Hexagon,
  Route,
  Pointer,
  Trash2,
  SquareX
} from "lucide-react";

import { GeofenceController } from "../controllers/GeofenceController";
import { geofenceStore } from "../store/GeofenceStore";
import { ZoneType, InteractionMode, GeometryType } from "../types/GeofenceTypes";

interface Props {
  onOpenManager?: () => void;
}

export default function GeofenceToolbar({ onOpenManager }: Props) {
  const [state, setState] = React.useState(geofenceStore.getState());

  React.useEffect(() => {
    return geofenceStore.subscribe(setState);
  }, []);

  const isDrawing = state.interactionMode === InteractionMode.DRAW;
  const isSelectMode = state.interactionMode === InteractionMode.SELECT;
  const vertexCount = state.drawing.vertices.length;
  const activeZone = state.drawing.activeZoneType;
  const activeGeom = state.drawing.activeGeometryType || GeometryType.POLYGON;

  return (
    <div className="absolute top-4 left-4 z-40 flex flex-col gap-2 select-none">
      {/* 1. GEOFENCE TOOLS TILES BOX (Matching Reference Image Floating Top-Left Card) */}
      <div className="bg-[#080d19]/95 border border-[#1b253b] backdrop-blur-xl p-2 rounded-xl shadow-2xl font-mono text-xs w-[320px]">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1 flex items-center justify-between border-b border-[#1b253b] pb-1">
          <span>GEOFENCE TOOLS</span>
          {isDrawing && (
            <span className="text-[9px] text-cyan-400 font-normal animate-pulse">DRAWING ACTIVE</span>
          )}
        </div>

        {/* 6 ACTION TILES GRID */}
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          {/* 1. DRAW POLYGON */}
          <button
            onClick={() => GeofenceController.startDrawing(activeZone, GeometryType.POLYGON)}
            className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-semibold transition-all border ${
              isDrawing && activeGeom === GeometryType.POLYGON
                ? "bg-cyan-500/25 text-cyan-300 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                : "bg-slate-900/70 text-slate-300 border-[#1a2336] hover:bg-[#121b2d] hover:text-white"
            }`}
          >
            <Hexagon size={18} className="text-cyan-400 mb-1" />
            <span>Draw Polygon</span>
          </button>

          {/* 2. DRAW CIRCLE */}
          <button
            onClick={() => GeofenceController.startDrawing(ZoneType.WARNING, GeometryType.CIRCLE)}
            className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-semibold transition-all border ${
              isDrawing && activeGeom === GeometryType.CIRCLE
                ? "bg-amber-500/25 text-amber-300 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                : "bg-slate-900/70 text-slate-300 border-[#1a2336] hover:bg-[#121b2d] hover:text-white"
            }`}
          >
            <Circle size={18} className="text-amber-400 mb-1" />
            <span>Draw Circle</span>
          </button>

          {/* 3. DRAW CORRIDOR */}
          <button
            onClick={() => GeofenceController.startDrawing(ZoneType.CORRIDOR, GeometryType.CORRIDOR)}
            className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-semibold transition-all border ${
              isDrawing && activeGeom === GeometryType.CORRIDOR
                ? "bg-blue-500/25 text-blue-300 border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                : "bg-slate-900/70 text-slate-300 border-[#1a2336] hover:bg-[#121b2d] hover:text-white"
            }`}
          >
            <Route size={18} className="text-blue-400 mb-1" />
            <span>Draw Corridor</span>
          </button>

          {/* 4. SELECT */}
          <button
            onClick={() => GeofenceController.setInteractionMode(InteractionMode.SELECT)}
            className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-semibold transition-all border ${
              isSelectMode
                ? "bg-slate-700/60 text-white border-slate-400"
                : "bg-slate-900/70 text-slate-300 border-[#1a2336] hover:bg-[#121b2d] hover:text-white"
            }`}
          >
            <Pointer size={18} className="text-slate-300 mb-1" />
            <span>Select</span>
          </button>

          {/* 5. DELETE */}
          <button
            onClick={() => {
              if (state.selection.selectedGeofenceId) {
                GeofenceController.deleteGeofence(state.selection.selectedGeofenceId);
              }
            }}
            disabled={!state.selection.selectedGeofenceId}
            className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-semibold transition-all border ${
              state.selection.selectedGeofenceId
                ? "bg-red-950/60 text-red-300 border-red-800 hover:bg-red-900 hover:text-white"
                : "bg-slate-900/40 text-slate-600 border-[#1a2336] cursor-not-allowed"
            }`}
          >
            <Trash2 size={18} className={state.selection.selectedGeofenceId ? "text-red-400 mb-1" : "text-slate-600 mb-1"} />
            <span>Delete</span>
          </button>

          {/* 6. CLEAR */}
          <button
            onClick={() => GeofenceController.clearAllGeofences()}
            className="flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-semibold transition-all border bg-slate-900/70 text-slate-300 border-[#1a2336] hover:bg-red-950/40 hover:text-red-400 hover:border-red-900/60"
          >
            <SquareX size={18} className="text-slate-400 mb-1 group-hover:text-red-400" />
            <span>Clear</span>
          </button>
        </div>

        {/* CLASSIFICATION TYPE SELECTOR PILLS */}
        <div className="flex items-center gap-1 pt-1.5 border-t border-[#1b253b]">
          <button
            onClick={() => GeofenceController.startDrawing(ZoneType.NO_FLY, activeGeom)}
            className={`flex-1 py-1 px-1.5 rounded text-[10px] font-bold text-center transition-all ${
              isDrawing && activeZone === ZoneType.NO_FLY
                ? "bg-red-500 text-white shadow"
                : "bg-red-950/40 text-red-400 border border-red-900/50 hover:bg-red-900/40"
            }`}
          >
            NO FLY
          </button>
          <button
            onClick={() => GeofenceController.startDrawing(ZoneType.WARNING, activeGeom)}
            className={`flex-1 py-1 px-1.5 rounded text-[10px] font-bold text-center transition-all ${
              isDrawing && activeZone === ZoneType.WARNING
                ? "bg-amber-500 text-black shadow"
                : "bg-amber-950/40 text-amber-400 border border-amber-900/50 hover:bg-amber-900/40"
            }`}
          >
            WARNING
          </button>
          <button
            onClick={() => GeofenceController.startDrawing(ZoneType.SAFE, activeGeom)}
            className={`flex-1 py-1 px-1.5 rounded text-[10px] font-bold text-center transition-all ${
              isDrawing && activeZone === ZoneType.SAFE
                ? "bg-emerald-500 text-white shadow"
                : "bg-emerald-950/40 text-emerald-400 border border-emerald-900/50 hover:bg-emerald-900/40"
            }`}
          >
            SAFE
          </button>
        </div>

        {/* ACTIVE DRAWING STATUS AND FINISH / CANCEL BAR */}
        {isDrawing && (
          <div className="mt-2 pt-2 border-t border-[#1b253b] flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
              <MousePointerClick size={12} className="text-cyan-400 animate-bounce" />
              <span>
                {activeGeom === GeometryType.CIRCLE
                  ? "Click center point"
                  : activeGeom === GeometryType.CORRIDOR
                  ? `${vertexCount}/2 points`
                  : `${vertexCount} points`}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {vertexCount > 0 && (
                <button
                  onClick={() => GeofenceController.undoLastPoint()}
                  className="p-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                  title="Undo last point"
                >
                  <Undo2 size={12} />
                </button>
              )}

              <button
                onClick={() => GeofenceController.finishDrawing()}
                disabled={activeGeom === GeometryType.POLYGON ? vertexCount < 3 : vertexCount < 2}
                className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                  (activeGeom === GeometryType.POLYGON && vertexCount >= 3) ||
                  (activeGeom === GeometryType.CORRIDOR && vertexCount >= 2) ||
                  activeGeom === GeometryType.CIRCLE
                    ? "bg-emerald-500 text-white hover:bg-emerald-400"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }`}
              >
                <Check size={12} />
                <span>Finish</span>
              </button>

              <button
                onClick={() => GeofenceController.cancelDrawing()}
                className="p-1 rounded bg-slate-800 text-red-400 hover:bg-red-950"
                title="Cancel drawing"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}