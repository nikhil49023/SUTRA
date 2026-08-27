import React, { memo, useState, useCallback } from 'react';
import { useGeofenceStore } from '../stores/geofenceStore';
import { useSelectionStore } from '../stores/selectionStore';
import { Shield, Maximize, Eye, EyeOff, Trash2, Copy, Power, PowerOff } from 'lucide-react';
import { formatDistance } from '../utils/formatting';
import { mapController } from '../map/MapController';
import { commandManager } from '../communication/CommandManager';
import { ZoneType } from '../types/geofence';

const ZONE_COLORS: Record<string, string> = {
  NO_FLY: '#C75A5A',
  WARNING: '#C49A4A',
  SAFE: '#4F9A72',
  INCLUSION: '#5B8FB9',
  EXCLUSION: '#C75A5A',
};

const ZONE_TYPES: ZoneType[] = ['NO_FLY', 'WARNING', 'SAFE'];

export const GeofenceProperties: React.FC = memo(() => {
  const geofences = useGeofenceStore((s) => s.geofences);
  const updateGeofence = useGeofenceStore((s) => s.updateGeofence);
  const deleteGeofence = useGeofenceStore((s) => s.deleteGeofence);
  const duplicateGeofence = useGeofenceStore((s) => s.duplicateGeofence);
  const toggleGeofenceEnabled = useGeofenceStore((s) => s.toggleGeofenceEnabled);
  const toggleGeofenceVisible = useGeofenceStore((s) => s.toggleGeofenceVisible);

  const selectedType = useSelectionStore((s) => s.selected_type);
  const selectedId = useSelectionStore((s) => s.selected_id);
  const clearSelection = useSelectionStore((s) => s.clearSelection);

  const [editName, setEditName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [editAltitude, setEditAltitude] = useState(false);
  const [altMin, setAltMin] = useState('');
  const [altMax, setAltMax] = useState('');

  const selectedGf = selectedType === 'GEOFENCE' ? geofences.find((g) => g.id === selectedId) : null;

  if (!selectedGf) return null;

  const zoneColor = ZONE_COLORS[selectedGf.zone_type] ?? '#5B8FB9';

  const handleFit = () => {
    mapController.geofenceLayer.fitGeofence(selectedGf);
  };

  const handleToggleVisible = () => toggleGeofenceVisible(selectedGf.id);
  const handleToggleEnabled = () => toggleGeofenceEnabled(selectedGf.id);

  const handleDuplicate = () => {
    duplicateGeofence(selectedGf.id);
  };

  const handleDelete = () => {
    if (confirm(`Delete geofence "${selectedGf.name}"?`)) {
      commandManager.sendCommand('geofence.delete', { geofence_id: selectedGf.id });
      deleteGeofence(selectedGf.id);
      clearSelection();
    }
  };

  const handleZoneTypeChange = (newType: ZoneType) => {
    updateGeofence(selectedGf.id, { zone_type: newType });
    commandManager.sendCommand('geofence.update', { geofence_id: selectedGf.id, zone_type: newType });
  };

  const handleNameSave = () => {
    if (nameValue.trim()) {
      updateGeofence(selectedGf.id, { name: nameValue.trim() });
      commandManager.sendCommand('geofence.update', { geofence_id: selectedGf.id, name: nameValue.trim() });
    }
    setEditName(false);
  };

  const handleAltSave = () => {
    const mn = parseFloat(altMin);
    const mx = parseFloat(altMax);
    if (!isNaN(mn) && !isNaN(mx) && mx >= mn) {
      updateGeofence(selectedGf.id, { altitude_min: mn, altitude_max: mx });
      commandManager.sendCommand('geofence.update', {
        geofence_id: selectedGf.id,
        altitude_min: mn,
        altitude_max: mx,
      });
    }
    setEditAltitude(false);
  };

  const handlePriorityChange = (p: number) => {
    updateGeofence(selectedGf.id, { priority: p });
    commandManager.sendCommand('geofence.update', { geofence_id: selectedGf.id, priority: p });
  };

  return (
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 font-mono text-xs space-y-2 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2B3743] pb-1.5">
        <div className="flex items-center space-x-1.5 font-bold text-[#E7EBEF]">
          <Shield className="w-3.5 h-3.5" style={{ color: zoneColor }} />
          <span style={{ color: zoneColor }}>{selectedGf.zone_type}</span>
          {!selectedGf.enabled && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-[#C75A5A]/20 text-[#C75A5A] font-bold">DISABLED</span>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <button onClick={handleFit} className="p-1 hover:text-[#5B8FB9] text-[#707C88] transition" title="Fit to map">
            <Maximize className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleDuplicate} className="p-1 hover:text-[#5B8FB9] text-[#707C88] transition" title="Duplicate">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleToggleEnabled} className="p-1 transition" title={selectedGf.enabled ? 'Disable' : 'Enable'}>
            {selectedGf.enabled ? (
              <Power className="w-3.5 h-3.5 text-[#4F9A72]" />
            ) : (
              <PowerOff className="w-3.5 h-3.5 text-[#C75A5A]" />
            )}
          </button>
          <button onClick={handleToggleVisible} className="p-1 transition" title={selectedGf.visible !== false ? 'Hide' : 'Show'}>
            {selectedGf.visible !== false ? (
              <Eye className="w-3.5 h-3.5 text-[#5B8FB9]" />
            ) : (
              <EyeOff className="w-3.5 h-3.5 text-[#707C88]" />
            )}
          </button>
          <button onClick={handleDelete} className="p-1 hover:text-[#C75A5A] text-[#707C88] transition" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Name */}
      <div>
        <div className="text-[10px] text-[#707C88] mb-0.5">NAME</div>
        {editName ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') setEditName(false); }}
              className="flex-1 bg-[#0B0F14] border border-[#5B8FB9] rounded px-2 py-0.5 text-[#E7EBEF] text-xs focus:outline-none"
            />
            <button onClick={handleNameSave} className="text-[#4F9A72] font-bold px-1">✓</button>
            <button onClick={() => setEditName(false)} className="text-[#707C88] px-1">✕</button>
          </div>
        ) : (
          <div
            className="text-[#E7EBEF] font-bold cursor-pointer hover:text-[#5B8FB9] transition truncate"
            onClick={() => { setNameValue(selectedGf.name); setEditName(true); }}
            title="Click to edit name"
          >
            {selectedGf.name}
          </div>
        )}
      </div>

      {/* Zone Type Selector */}
      <div>
        <div className="text-[10px] text-[#707C88] mb-0.5">ZONE TYPE</div>
        <div className="flex gap-1">
          {ZONE_TYPES.map((zt) => (
            <button
              key={zt}
              onClick={() => handleZoneTypeChange(zt)}
              className={`px-2 py-0.5 rounded border text-[9px] font-bold transition ${
                selectedGf.zone_type === zt
                  ? 'border-current bg-[#1B2530]'
                  : 'border-[#2B3743] bg-[#0B0F14] text-[#707C88] hover:text-[#E7EBEF]'
              }`}
              style={{ color: selectedGf.zone_type === zt ? ZONE_COLORS[zt] : undefined }}
            >
              {zt.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Altitude */}
      <div>
        <div className="text-[10px] text-[#707C88] mb-0.5">ALTITUDE WINDOW (AGL m)</div>
        {editAltitude ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              type="number"
              value={altMin}
              onChange={(e) => setAltMin(e.target.value)}
              placeholder="Min"
              className="w-16 bg-[#0B0F14] border border-[#5B8FB9] rounded px-1 py-0.5 text-[#E7EBEF] text-xs focus:outline-none"
            />
            <span className="text-[#707C88]">–</span>
            <input
              type="number"
              value={altMax}
              onChange={(e) => setAltMax(e.target.value)}
              placeholder="Max"
              className="w-16 bg-[#0B0F14] border border-[#5B8FB9] rounded px-1 py-0.5 text-[#E7EBEF] text-xs focus:outline-none"
            />
            <button onClick={handleAltSave} className="text-[#4F9A72] font-bold px-1">✓</button>
            <button onClick={() => setEditAltitude(false)} className="text-[#707C88] px-1">✕</button>
          </div>
        ) : (
          <div
            className="text-[#E7EBEF] font-bold cursor-pointer hover:text-[#5B8FB9] transition tabular-nums"
            onClick={() => {
              setAltMin(String(selectedGf.altitude_min ?? 0));
              setAltMax(String(selectedGf.altitude_max ?? 120));
              setEditAltitude(true);
            }}
            title="Click to edit altitude window"
          >
            {selectedGf.altitude_min ?? 0}m – {selectedGf.altitude_max ?? 120}m
          </div>
        )}
      </div>

      {/* Priority */}
      <div>
        <div className="text-[10px] text-[#707C88] mb-0.5">PRIORITY (1=LOW, 5=CRITICAL)</div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((p) => (
            <button
              key={p}
              onClick={() => handlePriorityChange(p)}
              className={`w-7 h-6 rounded border text-[10px] font-bold transition ${
                (selectedGf.priority ?? 3) === p
                  ? 'bg-[#1B2530] border-[#5B8FB9] text-[#5B8FB9]'
                  : 'bg-[#0B0F14] border-[#2B3743] text-[#707C88] hover:text-[#E7EBEF] hover:bg-[#151D26]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        <div className="bg-[#151D26] p-1.5 rounded border border-[#2B3743]">
          <span className="text-[#707C88] text-[9px]">AREA</span>
          <div className="font-bold text-[#5B8FB9] tabular-nums">
            {selectedGf.area_sqm ? `${(selectedGf.area_sqm / 10000).toFixed(2)} ha` : '--'}
          </div>
        </div>
        <div className="bg-[#151D26] p-1.5 rounded border border-[#2B3743]">
          <span className="text-[#707C88] text-[9px]">PERIMETER</span>
          <div className="font-bold text-[#5B8FB9] tabular-nums">
            {selectedGf.perimeter_m ? formatDistance(selectedGf.perimeter_m) : '--'}
          </div>
        </div>
        <div className="bg-[#151D26] p-1.5 rounded border border-[#2B3743]">
          <span className="text-[#707C88] text-[9px]">GEOMETRY</span>
          <div className="font-bold text-[#E7EBEF] tabular-nums">{selectedGf.geometry_type}</div>
        </div>
        <div className="bg-[#151D26] p-1.5 rounded border border-[#2B3743]">
          <span className="text-[#707C88] text-[9px]">VERTICES</span>
          <div className="font-bold text-[#E7EBEF] tabular-nums">
            {selectedGf.coordinates ? selectedGf.coordinates.length : 0}
          </div>
        </div>
      </div>
    </div>
  );
});
