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
    if (drawing_points.length < (active_geometry_type === 'CIRCLE' ? 1 : 3)) return;

    const name = `${active_zone_type} Zone`;

    // 1. Add an optimistic local geofence immediately so operator sees it right away
    const tempId = `gf-optimistic-${Date.now()}`;
    const optimisticGf = {
      id: tempId,
      name,
      zone_type: active_zone_type,
      geometry_type: active_geometry_type,
      coordinates: [...drawing_points] as [number, number][],
      altitude_min: 0,
      altitude_max: 120,
      enabled: true,
      visible: true,
    };
    useGeofenceStore.setState((s) => ({ geofences: [...s.geofences, optimisticGf] }));

    // 2. Send coordinates to backend — backend is authoritative and will emit geofence.created
    commandManager.sendCommand('geofence.finish_drawing', {
      name,
      zone_type: active_zone_type,
      geometry_type: active_geometry_type,
      coordinates: drawing_points,
    });

    // 3. Exit drawing mode (the optimistic geofence keeps the fence visible)
    useGeofenceStore.setState({ drawing_mode: false, drawing_points: [], preview_point: null });
    setInteractionMode('SELECT');
  };


  const handleCancel = () => {
    cancelDrawing();
    setInteractionMode('SELECT');
    commandManager.sendCommand('geofence.cancel_drawing', {});
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[#11171E]/95 border border-[#2B3743] rounded-lg text-xs font-mono select-none">
      {!drawing_mode ? (
        <>
          <button
            onClick={() => handleStartDrawing('NO_FLY', 'POLYGON')}
            className="px-2.5 py-1.5 rounded border border-[#C75A5A]/40 bg-[#151D26] hover:bg-[#1B2530] text-[#C75A5A] font-bold transition flex items-center space-x-1.5"
          >
            <Hexagon className="w-3.5 h-3.5 text-[#C75A5A]" />
            <span>+ NO FLY POLYGON</span>
          </button>

          <button
            onClick={() => handleStartDrawing('WARNING', 'POLYGON')}
            className="px-2.5 py-1.5 rounded border border-[#C49A4A]/40 bg-[#151D26] hover:bg-[#1B2530] text-[#C49A4A] font-bold transition flex items-center space-x-1.5"
          >
            <Hexagon className="w-3.5 h-3.5 text-[#C49A4A]" />
            <span>+ WARNING POLYGON</span>
          </button>

          <button
            onClick={() => handleStartDrawing('SAFE', 'POLYGON')}
            className="px-2.5 py-1.5 rounded border border-[#4F9A72]/40 bg-[#151D26] hover:bg-[#1B2530] text-[#4F9A72] font-bold transition flex items-center space-x-1.5"
          >
            <Shield className="w-3.5 h-3.5 text-[#4F9A72]" />
            <span>+ SAFE ZONE</span>
          </button>

          <button
            onClick={() => handleStartDrawing('NO_FLY', 'CIRCLE')}
            className="px-2.5 py-1.5 rounded border border-[#2B3743] bg-[#11171E] hover:bg-[#151D26] text-[#A9B3BD] transition flex items-center space-x-1.5"
          >
            <Circle className="w-3.5 h-3.5 text-[#5B8FB9]" />
            <span>CIRCLE</span>
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center space-x-2 px-2.5 py-1 bg-[#1B2530] border border-[#C49A4A] rounded text-[#C49A4A] animate-pulse font-bold">
            <span>DRAWING {active_zone_type} {active_geometry_type} ({drawing_points.length} pts)</span>
          </div>

          <button
            onClick={undoDrawingPoint}
            disabled={drawing_points.length === 0}
            className="px-2 py-1.5 rounded border border-[#2B3743] bg-[#11171E] hover:bg-[#151D26] text-[#A9B3BD] disabled:opacity-40 transition flex items-center space-x-1"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>UNDO PT</span>
          </button>

          <button
            onClick={handleFinish}
            disabled={drawing_points.length < (active_geometry_type === 'CIRCLE' ? 1 : 3)}
            className="px-2.5 py-1.5 rounded border border-[#4F9A72]/50 bg-[#151D26] hover:bg-[#1B2530] text-[#4F9A72] font-bold disabled:opacity-40 transition flex items-center space-x-1"
          >
            <Check className="w-3.5 h-3.5" />
            <span>FINISH GEOFENCE</span>
          </button>

          <button
            onClick={handleCancel}
            className="px-2 py-1.5 rounded border border-[#C75A5A]/50 bg-[#151D26] hover:bg-[#1B2530] text-[#C75A5A] transition flex items-center space-x-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>CANCEL</span>
          </button>
        </>
      )}
    </div>
  );
};
