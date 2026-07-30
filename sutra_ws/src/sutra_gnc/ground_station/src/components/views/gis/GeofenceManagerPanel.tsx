import React from 'react';
import { ShieldAlert, Plus, Trash2, Edit2, Eye, EyeOff, Layers, Check } from 'lucide-react';
import { GISService } from '../../../services/gisService';

export type GeofenceZoneType =
  | 'NO_FLY_ZONE'
  | 'SAFE_ZONE'
  | 'WARNING_ZONE'
  | 'SEARCH_AREA'
  | 'EMERGENCY_LANDING_AREA';

export interface GeofencePolygonData {
  id: string;
  name: string;
  type: GeofenceZoneType;
  color: string;
  points: [number, number][]; // [lat, lng]
  minAltM: number;
  maxAltM: number;
  visible: boolean;
}

interface GeofenceManagerPanelProps {
  geofences: GeofencePolygonData[];
  selectedId: string | null;
  onSelectGeofence: (id: string | null) => void;
  onAddGeofence: () => void;
  onDeleteGeofence: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onUpdateGeofence: (id: string, updated: Partial<GeofencePolygonData>) => void;
  isDrawing: boolean;
  onStartDrawing: () => void;
  onFinishDrawing: () => void;
  drawingPointCount: number;
}

export const GeofenceManagerPanel: React.FC<GeofenceManagerPanelProps> = ({
  geofences,
  selectedId,
  onSelectGeofence,
  onAddGeofence,
  onDeleteGeofence,
  onToggleVisibility,
  onUpdateGeofence,
  isDrawing,
  onStartDrawing,
  onFinishDrawing,
  drawingPointCount
}) => {
  const getZoneColor = (type: GeofenceZoneType) => {
    switch (type) {
      case 'NO_FLY_ZONE': return '#ff3b30';
      case 'SAFE_ZONE': return '#00e676';
      case 'WARNING_ZONE': return '#ffb700';
      case 'SEARCH_AREA': return '#00f0ff';
      case 'EMERGENCY_LANDING_AREA': return '#a855f7';
      default: return '#00f0ff';
    }
  };

  return (
    <div className="w-80 bg-[#090e18]/95 border border-[#1a2336] backdrop-blur-md p-3.5 rounded-xl shadow-2xl space-y-3 font-mono">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-[#1a2336] pb-2">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Geofence Manager</span>
        </div>
        <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-bold">
          {geofences.length} ZONES
        </span>
      </div>

      {/* DRAWING CONTROL BUTTON */}
      {isDrawing ? (
        <div className="space-y-1.5 p-2 bg-rose-500/10 border border-rose-500/40 rounded-lg">
          <div className="flex items-center justify-between text-[10px] text-rose-300 font-bold">
            <span>DRAWING POLYGON...</span>
            <span>{drawingPointCount} VERTICES</span>
          </div>
          <button
            onClick={onFinishDrawing}
            disabled={drawingPointCount < 3}
            className={`w-full py-1.5 rounded text-xs font-bold transition-all flex items-center justify-center space-x-1 ${
              drawingPointCount >= 3
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>FINISH POLYGON ({drawingPointCount}/3 MIN)</span>
          </button>
        </div>
      ) : (
        <button
          onClick={onStartDrawing}
          className="w-full py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/50 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>DRAW NEW GEOFENCE ZONE</span>
        </button>
      )}

      {/* GEOFENCE ZONE LIST */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {geofences.map((gf) => {
          const isSelected = gf.id === selectedId;
          const areaCalc = GISService.calculatePolygonArea(gf.points);
          const color = gf.color || getZoneColor(gf.type);

          return (
            <div
              key={gf.id}
              onClick={() => onSelectGeofence(gf.id)}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer space-y-1.5 ${
                isSelected
                  ? 'bg-[#10192a] border-cyan-400 shadow-[0_0_12px_#00f0ff33]'
                  : 'bg-[#050912]/80 border-[#162032] hover:border-slate-700'
              }`}
            >
              {/* TITLE & TOGGLE */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></span>
                  <span className="text-xs font-bold text-slate-200">{gf.name}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisibility(gf.id);
                    }}
                    className="p-1 text-slate-400 hover:text-cyan-400"
                  >
                    {gf.visible ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-600" />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteGeofence(gf.id);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* ZONE TYPE BADGE & SPATIAL METRICS */}
              <div className="flex items-center justify-between text-[9px] text-slate-400 border-t border-[#141e30] pt-1">
                <span className="font-bold uppercase" style={{ color }}>
                  {gf.type.replace(/_/g, ' ')}
                </span>
                <span>{areaCalc.hectares.toFixed(2)} HA ({gf.points.length} VERTICES)</span>
              </div>

              {/* ALTITUDE CEILING INPUTS (IF SELECTED) */}
              {isSelected && (
                <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-[#141e30] text-[9px]">
                  <div>
                    <label className="text-slate-400 block">MIN ALT (M)</label>
                    <input
                      type="number"
                      value={gf.minAltM}
                      onChange={(e) => onUpdateGeofence(gf.id, { minAltM: +e.target.value })}
                      className="w-full bg-[#080d16] border border-[#1e293b] px-1.5 py-0.5 rounded text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block">MAX ALT (M)</label>
                    <input
                      type="number"
                      value={gf.maxAltM}
                      onChange={(e) => onUpdateGeofence(gf.id, { maxAltM: +e.target.value })}
                      className="w-full bg-[#080d16] border border-[#1e293b] px-1.5 py-0.5 rounded text-slate-200"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
