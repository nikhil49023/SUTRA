import React, { memo } from 'react';
import { useGeofenceStore } from '../stores/geofenceStore';
import { useSelectionStore } from '../stores/selectionStore';
import { Shield, Maximize, Eye, EyeOff, Trash2 } from 'lucide-react';
import { formatDistance } from '../utils/formatting';
import { mapController } from '../map/MapController';
import { commandManager } from '../communication/CommandManager';

const ZONE_COLORS: Record<string, string> = {
  NO_FLY: '#C75A5A',
  WARNING: '#C49A4A',
  SAFE: '#4F9A72',
  INCLUSION: '#5B8FB9',
  EXCLUSION: '#C75A5A',
};

export const GeofenceProperties: React.FC = memo(() => {
  const geofences = useGeofenceStore((s) => s.geofences);
  const updateGeofence = useGeofenceStore((s) => s.updateGeofence);
  const deleteGeofence = useGeofenceStore((s) => s.deleteGeofence);
  const selectedType = useSelectionStore((s) => s.selected_type);
  const selectedId = useSelectionStore((s) => s.selected_id);
  const clearSelection = useSelectionStore((s) => s.clearSelection);

  const selectedGf =
    selectedType === 'GEOFENCE' ? geofences.find((g) => g.id === selectedId) : null;

  if (!selectedGf) return null;

  const zoneColor = ZONE_COLORS[selectedGf.zone_type] ?? '#5B8FB9';

  const handleFitToGeofence = () => {
    mapController.geofenceLayer.fitGeofence(selectedGf);
  };

  const handleToggleVisibility = () => {
    const newVisible = !selectedGf.visible;
    updateGeofence(selectedGf.id, { visible: newVisible });
    commandManager.sendCommand('geofence.update', {
      geofence_id: selectedGf.id,
      visible: newVisible,
    });
  };

  const handleDelete = () => {
    if (confirm(`Delete geofence "${selectedGf.name}"?`)) {
      commandManager.sendCommand('geofence.delete', { geofence_id: selectedGf.id });
      deleteGeofence(selectedGf.id);
      clearSelection();
    }
  };

  return (
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 font-mono text-xs space-y-2 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2B3743] pb-1.5">
        <div className="flex items-center space-x-1.5 font-bold text-[#E7EBEF]">
          <Shield className="w-3.5 h-3.5" style={{ color: zoneColor }} />
          <span style={{ color: zoneColor }}>{selectedGf.zone_type}</span>
          <span className="text-[#A9B3BD] font-normal ml-1 truncate">{selectedGf.name}</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="bg-[#151D26] p-2 rounded border border-[#2B3743]">
          <span className="text-[#707C88] text-[10px]">TOTAL AREA</span>
          <div className="font-bold text-[#5B8FB9] mt-0.5 tabular-nums">
            {selectedGf.area_sqm ? `${(selectedGf.area_sqm / 10000).toFixed(2)} ha` : '--'}
          </div>
        </div>

        <div className="bg-[#151D26] p-2 rounded border border-[#2B3743]">
          <span className="text-[#707C88] text-[10px]">PERIMETER</span>
          <div className="font-bold text-[#5B8FB9] mt-0.5 tabular-nums">
            {selectedGf.perimeter_m ? formatDistance(selectedGf.perimeter_m) : '--'}
          </div>
        </div>

        <div className="bg-[#151D26] p-2 rounded border border-[#2B3743]">
          <span className="text-[#707C88] text-[10px]">ALT MIN</span>
          <div className="font-bold text-[#E7EBEF] mt-0.5 tabular-nums">
            {selectedGf.altitude_min ?? 0} m
          </div>
        </div>

        <div className="bg-[#151D26] p-2 rounded border border-[#2B3743]">
          <span className="text-[#707C88] text-[10px]">ALT MAX</span>
          <div className="font-bold text-[#E7EBEF] mt-0.5 tabular-nums">
            {selectedGf.altitude_max ?? 120} m
          </div>
        </div>
      </div>

      <div className="bg-[#151D26] p-2 rounded border border-[#2B3743] text-[11px] flex justify-between items-center">
        <span className="text-[#707C88]">VERTICES:</span>
        <span className="font-bold text-[#E7EBEF] tabular-nums">
          {selectedGf.coordinates ? selectedGf.coordinates.length : 0}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-1">
        <button
          onClick={handleFitToGeofence}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded border border-[#2B3743] bg-[#151D26] hover:bg-[#1B2530] text-[#5B8FB9] transition text-[11px]"
          title="Fit camera to geofence"
        >
          <Maximize className="w-3 h-3" />
          <span>FIT</span>
        </button>

        <button
          onClick={handleToggleVisibility}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded border border-[#2B3743] bg-[#151D26] hover:bg-[#1B2530] text-[#A9B3BD] transition text-[11px]"
          title={selectedGf.visible !== false ? 'Hide geofence' : 'Show geofence'}
        >
          {selectedGf.visible !== false ? (
            <Eye className="w-3 h-3 text-[#4F9A72]" />
          ) : (
            <EyeOff className="w-3 h-3 text-[#707C88]" />
          )}
          <span>{selectedGf.visible !== false ? 'VISIBLE' : 'HIDDEN'}</span>
        </button>

        <button
          onClick={handleDelete}
          className="px-2 py-1.5 rounded border border-[#C75A5A]/40 bg-[#151D26] hover:bg-[#1B2530] text-[#C75A5A] transition text-[11px]"
          title="Delete geofence"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
});
