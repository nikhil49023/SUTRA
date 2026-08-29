import React, { useState, memo } from 'react';
import { useGeofenceStore } from '../stores/geofenceStore';
import { useSelectionStore } from '../stores/selectionStore';
import { useMapStore } from '../stores/mapStore';
import { commandManager } from '../communication/CommandManager';
import { mapController } from '../map/MapController';
import { ZoneType, GeometryType } from '../types/geofence';
import { Shield, Hexagon, Circle, Route, Check, X, Undo2 } from 'lucide-react';

export const GeofenceToolbar: React.FC = memo(() => {
  const drawingMode = useGeofenceStore((s) => s.drawing_mode);
  const activeZoneType = useGeofenceStore((s) => s.active_zone_type);
  const activeGeometryType = useGeofenceStore((s) => s.active_geometry_type);
  const drawingPoints = useGeofenceStore((s) => s.drawing_points);
  const startDrawing = useGeofenceStore((s) => s.startDrawing);
  const undoDrawingPoint = useGeofenceStore((s) => s.undoDrawingPoint);
  const cancelDrawing = useGeofenceStore((s) => s.cancelDrawing);

  const [zoneName, setZoneName] = useState('');
  const setInteractionMode = useMapStore((s) => s.setInteractionMode);

  const handleStartDrawing = (zoneType: ZoneType, geometryType: GeometryType) => {
    // 1. Set local drawing state & default name
    const count = useGeofenceStore.getState().geofences.length + 1;
    const defaultName =
      zoneType === 'SAFE'
        ? `Safe Area ${count}`
        : zoneType === 'WARNING'
        ? `Warning Sector ${count}`
        : `Restricted Zone ${count}`;
    setZoneName(defaultName);

    startDrawing(zoneType, geometryType);
    // 2. Activate DRAW_GEOFENCE mode on map (shows banner + correct crosshair cursor)
    setInteractionMode('DRAW_GEOFENCE');
    // 3. Notify backend
    commandManager.sendCommand('geofence.start_drawing', {
      zone_type: zoneType,
      geometry_type: geometryType,
    });
  };

  const handleFinish = () => {
    const minPoints = activeGeometryType === 'CIRCLE' ? 1 : activeGeometryType === 'CORRIDOR' ? 2 : 3;
    if (drawingPoints.length < minPoints) return;

    const count = useGeofenceStore.getState().geofences.length + 1;
    const name = zoneName.trim() || `${activeZoneType} Zone #${count}`;
    const tempId = `gf-optimistic-${Date.now()}`;

    let center: [number, number] | null = null;
    let radius = 200;
    if (activeGeometryType === 'CIRCLE' && drawingPoints.length >= 1) {
      center = drawingPoints[0];
      if (drawingPoints.length >= 2) {
        radius = calculateDistance(drawingPoints[0], drawingPoints[1]);
      }
    }

    // 1. Add an optimistic local geofence immediately so operator sees it right away
    const optimisticGf = {
      id: tempId,
      name,
      zone_type: activeZoneType,
      geometry_type: activeGeometryType,
      coordinates: [...drawingPoints] as [number, number][],
      center,
      radius,
      corridor_width: 50,
      altitude_min: 0,
      altitude_max: 120,
      priority: activeZoneType === 'NO_FLY' ? 5 : 3,
      enabled: true,
      visible: true,
    };
    useGeofenceStore.setState((s) => ({ geofences: [...s.geofences, optimisticGf] }));

    // 2. Send coordinates to backend — backend is authoritative and will emit geofence.created
    commandManager.sendCommand('geofence.finish_drawing', {
      name,
      zone_type: activeZoneType,
      geometry_type: activeGeometryType,
      coordinates: drawingPoints,
      center,
      radius,
      corridor_width: 50,
      altitude_min: 0,
      altitude_max: 120,
    });

    // 3. Exit drawing mode cleanly without leaving edit dots on the box!
    useGeofenceStore.setState({ drawing_mode: false, drawing_points: [], preview_point: null });
    useSelectionStore.getState().clearSelection();
    mapController.geofenceLayer.clearHandles();
    setInteractionMode('SELECT');
  };

  const handleCancel = () => {
    cancelDrawing();
    useSelectionStore.getState().clearSelection();
    mapController.geofenceLayer.clearHandles();
    setInteractionMode('SELECT');
    commandManager.sendCommand('geofence.cancel_drawing', {});
  };

  const minPts = activeGeometryType === 'CIRCLE' ? 1 : activeGeometryType === 'CORRIDOR' ? 2 : 3;

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[#11171E]/95 border border-[#2B3743] rounded-lg text-xs font-mono select-none shadow-2xl">
      {!drawingMode ? (
        <>
          <button
            onClick={() => handleStartDrawing('NO_FLY', 'POLYGON')}
            className="px-2.5 py-1.5 rounded border border-[#C75A5A]/40 bg-[#151D26] hover:bg-[#1B2530] text-[#C75A5A] font-bold transition flex items-center space-x-1.5"
            title="Draw polygon restricted airspace (NO FLY)"
          >
            <Hexagon className="w-3.5 h-3.5 text-[#C75A5A]" />
            <span>+ NO FLY POLYGON</span>
          </button>

          <button
            onClick={() => handleStartDrawing('WARNING', 'POLYGON')}
            className="px-2.5 py-1.5 rounded border border-[#C49A4A]/40 bg-[#151D26] hover:bg-[#1B2530] text-[#C49A4A] font-bold transition flex items-center space-x-1.5"
            title="Draw warning perimeter buffer zone"
          >
            <Hexagon className="w-3.5 h-3.5 text-[#C49A4A]" />
            <span>+ WARNING POLYGON</span>
          </button>

          <button
            onClick={() => handleStartDrawing('SAFE', 'POLYGON')}
            className="px-2.5 py-1.5 rounded border border-[#4F9A72]/40 bg-[#151D26] hover:bg-[#1B2530] text-[#4F9A72] font-bold transition flex items-center space-x-1.5"
            title="Draw safe operating zone"
          >
            <Shield className="w-3.5 h-3.5 text-[#4F9A72]" />
            <span>+ SAFE ZONE</span>
          </button>

          <button
            onClick={() => handleStartDrawing('NO_FLY', 'CIRCLE')}
            className="px-2.5 py-1.5 rounded border border-[#2B3743] bg-[#11171E] hover:bg-[#151D26] text-[#A9B3BD] hover:text-[#E7EBEF] transition flex items-center space-x-1.5"
            title="Draw radial circle zone"
          >
            <Circle className="w-3.5 h-3.5 text-[#5B8FB9]" />
            <span>CIRCLE</span>
          </button>

          <button
            onClick={() => handleStartDrawing('SAFE', 'CORRIDOR')}
            className="px-2.5 py-1.5 rounded border border-[#2B3743] bg-[#11171E] hover:bg-[#151D26] text-[#A9B3BD] hover:text-[#E7EBEF] transition flex items-center space-x-1.5"
            title="Draw flight path corridor"
          >
            <Route className="w-3.5 h-3.5 text-[#5B8FB9]" />
            <span>CORRIDOR</span>
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center space-x-1.5 px-2 py-1 bg-[#151D26] border border-[#2B3743] rounded">
            <span
              className={`w-2 h-2 rounded-full ${
                activeZoneType === 'SAFE'
                  ? 'bg-[#10B981]'
                  : activeZoneType === 'WARNING'
                  ? 'bg-[#F59E0B]'
                  : 'bg-[#EF4444]'
              }`}
            />
            <span className="font-bold text-[#E7EBEF] text-[11px]">{activeZoneType}</span>
            <span className="text-[#707C88] text-[10px]">({drawingPoints.length} pts)</span>
          </div>

          {/* Interactive Zone Name Input */}
          <div className="flex items-center space-x-1.5 bg-[#0B0F14] border border-[#5B8FB9]/60 rounded px-2 py-1 shadow-inner">
            <span className="text-[9px] font-bold text-[#5B8FB9]">NAME:</span>
            <input
              type="text"
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              placeholder="Enter zone name..."
              className="bg-transparent text-[#E7EBEF] text-xs font-bold focus:outline-none w-36 sm:w-48 placeholder-[#707C88]"
            />
          </div>

          <button
            onClick={undoDrawingPoint}
            disabled={drawingPoints.length === 0}
            className="px-2 py-1.5 rounded border border-[#2B3743] bg-[#11171E] hover:bg-[#151D26] text-[#A9B3BD] disabled:opacity-40 transition flex items-center space-x-1"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>UNDO PT</span>
          </button>

          <button
            onClick={handleFinish}
            disabled={drawingPoints.length < minPts}
            className="px-3 py-1.5 rounded border border-[#10B981] bg-[#10B981]/20 hover:bg-[#10B981]/30 text-[#10B981] font-bold disabled:opacity-40 transition flex items-center space-x-1 shadow"
            title="Finish drawing and save zone (without lingering dots)"
          >
            <Check className="w-3.5 h-3.5" />
            <span>FINISH GEOFENCE</span>
          </button>

          <button
            onClick={handleCancel}
            className="px-2 py-1.5 rounded border border-[#EF4444]/50 bg-[#151D26] hover:bg-[#1B2530] text-[#EF4444] transition flex items-center space-x-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>CANCEL</span>
          </button>
        </>
      )}
    </div>
  );
});

function calculateDistance(p1: [number, number], p2: [number, number]): number {
  const R = 6371000;
  const dLat = ((p2[0] - p1[0]) * Math.PI) / 180;
  const dLon = ((p2[1] - p1[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1[0] * Math.PI) / 180) *
      Math.cos((p2[0] * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
