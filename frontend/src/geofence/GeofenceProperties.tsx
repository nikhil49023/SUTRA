import React from 'react';
import { useGeofenceStore } from '../stores/geofenceStore';
import { useSelectionStore } from '../stores/selectionStore';
import { Shield, MapPin, Maximize, AlertTriangle } from 'lucide-react';
import { formatDistance } from '../utils/formatting';

export const GeofenceProperties: React.FC = () => {
  const { geofences } = useGeofenceStore();
  const { selected_type, selected_id } = useSelectionStore();

  const selectedGf =
    selected_type === 'GEOFENCE' ? geofences.find((g) => g.id === selected_id) : null;

  if (!selectedGf) return null;

  return (
    <div className="bg-[#0f141c]/90 border border-slate-800 rounded-lg p-3 font-mono text-xs space-y-2 select-none">
      <div className="flex items-center space-x-1.5 font-bold text-slate-200 border-b border-slate-800 pb-1.5">
        <Shield className="w-3.5 h-3.5 text-cyan-400" />
        <span>GEOMETRIC CONTAINMENT METRICS</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
          <span className="text-slate-400 text-[10px]">TOTAL AREA</span>
          <div className="font-bold text-cyan-300 mt-0.5 tabular-nums">
            {selectedGf.area_sqm ? `${(selectedGf.area_sqm / 10000).toFixed(2)} ha` : '--'}
          </div>
        </div>

        <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
          <span className="text-slate-400 text-[10px]">PERIMETER</span>
          <div className="font-bold text-cyan-300 mt-0.5 tabular-nums">
            {selectedGf.perimeter_m ? formatDistance(selectedGf.perimeter_m) : '--'}
          </div>
        </div>
      </div>

      <div className="bg-slate-900/60 p-2 rounded border border-slate-800 text-[11px] flex justify-between">
        <span className="text-slate-400">VERTICES COUNT:</span>
        <span className="font-bold text-slate-200">
          {selectedGf.coordinates ? selectedGf.coordinates.length : 0}
        </span>
      </div>
    </div>
  );
};
