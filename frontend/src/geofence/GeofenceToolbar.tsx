import React from 'react';
import { useGeofenceStore } from '../stores/geofenceStore';
import { useMapStore } from '../stores/mapStore';
import { commandManager } from '../communication/CommandManager';
import { Shield, Hexagon, Circle, Check, X, Undo2 } from 'lucide-react';

export const GeofenceToolbar: React.FC = () => {
  const {
    drawing_mode,
    active_zone_type,
    active_geometry_type,
    drawing_points,
    startDrawing,
    undoDrawingPoint,
    cancelDrawing,
  } = useGeofenceStore();

  const { setInteractionMode } = useMapStore();

  const handleStartDrawing = (zoneType: 'NO_FLY' | 'WARNING' | 'SAFE', geometryType: 'POLYGON' | 'CIRCLE') => {
    // 1. Set local drawing state
    startDrawing(zoneType, geometryType);
    // 2. Activate DRAW_GEOFENCE mode on map (shows banner + correct cursor)
    setInteractionMode('DRAW_GEOFENCE');
    // 3. Notify backend
    commandManager.sendCommand('geofence.start_drawing', {
      zone_type: zoneType,
      geometry_type: geometryType,
    });
  };

  const handleFinish = () => {
    const name = `${active_zone_type} Zone`;
    commandManager.sendCommand('geofence.finish_drawing', {
      name,
      zone_type: active_zone_type,
      geometry_type: active_geometry_type,
    });
    useGeofenceStore.setState({ drawing_mode: false, drawing_points: [], preview_point: null });
    setInteractionMode('SELECT');
  };

  const handleCancel = () => {
    cancelDrawing();
    setInteractionMode('SELECT');
    commandManager.sendCommand('geofence.cancel_drawing', {});
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[#0f141c]/90 border border-slate-800 rounded-lg text-xs font-mono select-none">
      {!drawing_mode ? (
        <>
          <button
            onClick={() => handleStartDrawing('NO_FLY', 'POLYGON')}
            className="px-2.5 py-1.5 rounded border border-rose-500/40 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 font-bold transition flex items-center space-x-1.5"
          >
            <Hexagon className="w-3.5 h-3.5 text-rose-400" />
            <span>+ NO FLY POLYGON</span>
          </button>

          <button
            onClick={() => handleStartDrawing('WARNING', 'POLYGON')}
            className="px-2.5 py-1.5 rounded border border-amber-500/40 bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 font-bold transition flex items-center space-x-1.5"
          >
            <Hexagon className="w-3.5 h-3.5 text-amber-400" />
            <span>+ WARNING POLYGON</span>
          </button>

          <button
            onClick={() => handleStartDrawing('SAFE', 'POLYGON')}
            className="px-2.5 py-1.5 rounded border border-emerald-500/40 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 font-bold transition flex items-center space-x-1.5"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ SAFE ZONE</span>
          </button>

          <button
            onClick={() => handleStartDrawing('NO_FLY', 'CIRCLE')}
            className="px-2.5 py-1.5 rounded border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 transition flex items-center space-x-1.5"
          >
            <Circle className="w-3.5 h-3.5 text-cyan-400" />
            <span>CIRCLE</span>
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center space-x-2 px-2.5 py-1 bg-amber-950/80 border border-amber-500/50 rounded text-amber-300 animate-pulse font-bold">
            <span>DRAWING {active_zone_type} {active_geometry_type} ({drawing_points.length} pts)</span>
          </div>

          <button
            onClick={undoDrawingPoint}
            disabled={drawing_points.length === 0}
            className="px-2 py-1.5 rounded border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 disabled:opacity-40 transition flex items-center space-x-1"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>UNDO PT</span>
          </button>

          <button
            onClick={handleFinish}
            disabled={drawing_points.length < (active_geometry_type === 'CIRCLE' ? 1 : 3)}
            className="px-2.5 py-1.5 rounded border border-emerald-500/50 bg-emerald-950 hover:bg-emerald-900 text-emerald-200 font-bold disabled:opacity-40 transition flex items-center space-x-1"
          >
            <Check className="w-3.5 h-3.5" />
            <span>FINISH GEOFENCE</span>
          </button>

          <button
            onClick={handleCancel}
            className="px-2 py-1.5 rounded border border-rose-500/50 bg-rose-950 hover:bg-rose-900 text-rose-300 transition flex items-center space-x-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>CANCEL</span>
          </button>
        </>
      )}
    </div>
  );
};
