import React, { useState, useEffect, memo } from 'react';
import { useGeofenceStore } from '../stores/geofenceStore';
import { useSelectionStore } from '../stores/selectionStore';
import { commandManager } from '../communication/CommandManager';
import { mapController } from '../map/MapController';
import { ZoneType } from '../types/geofence';
import { Edit3, Save, CheckCircle2, Check, X } from 'lucide-react';

export const GeofenceEditor: React.FC = memo(() => {
  const geofences = useGeofenceStore((s) => s.geofences);
  const updateGeofence = useGeofenceStore((s) => s.updateGeofence);
  const selectedType = useSelectionStore((s) => s.selected_type);
  const selectedId = useSelectionStore((s) => s.selected_id);
  const clearSelection = useSelectionStore((s) => s.clearSelection);

  const selectedGf =
    selectedType === 'GEOFENCE' ? geofences.find((g) => g.id === selectedId) : null;

  const [name, setName] = useState('');
  const [zoneType, setZoneType] = useState<ZoneType>('NO_FLY');
  const [altMin, setAltMin] = useState(0);
  const [altMax, setAltMax] = useState(120);
  const [priority, setPriority] = useState(3);
  const [radius, setRadius] = useState(200);
  const [corridorWidth, setCorridorWidth] = useState(50);
  const [isSaved, setIsSaved] = useState(false);

  // Only re-initialize form fields when the selected geofence ID changes
  useEffect(() => {
    if (selectedGf) {
      setName(selectedGf.name);
      setZoneType(selectedGf.zone_type);
      setAltMin(selectedGf.altitude_min ?? 0);
      setAltMax(selectedGf.altitude_max ?? 120);
      setPriority(selectedGf.priority ?? 3);
      setRadius(selectedGf.radius ?? 200);
      setCorridorWidth(selectedGf.corridor_width ?? 50);
      setIsSaved(false);
    }
  }, [selectedGf?.id]);

  if (!selectedGf) {
    if (geofences.length === 0) return null;
    return (
      <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 font-mono text-xs space-y-2 select-none">
        <div className="flex items-center space-x-1.5 font-bold text-[#5B8FB9] border-b border-[#2B3743] pb-2">
          <Edit3 className="w-3.5 h-3.5" />
          <span>EDIT GEOFENCE</span>
        </div>
        <label className="text-[10px] text-[#707C88] block">SELECT GEOFENCE TO EDIT:</label>
        <select
          onChange={(e) => {
            if (e.target.value) {
              useSelectionStore.getState().selectGeofence(e.target.value);
              commandManager.sendCommand('GEOFENCE_SELECT', { geofence_id: e.target.value });
            }
          }}
          defaultValue=""
          className="w-full bg-[#0B0F14] border border-[#2B3743] rounded px-2 py-1 text-[#E7EBEF] text-xs focus:border-[#5B8FB9] focus:outline-none"
        >
          <option value="" disabled>Choose a zone to edit...</option>
          {geofences.map((g) => (
            <option key={g.id} value={g.id}>{g.name} ({g.zone_type})</option>
          ))}
        </select>
      </div>
    );
  }

const ZONE_THEMES: Record<ZoneType, { color: string; bg: string; border: string; text: string; badge: string; saveBtn: string }> = {
  SAFE: {
    color: '#10B981',
    bg: 'bg-[#10B981]/15',
    border: 'border-[#10B981]/50',
    text: 'text-[#10B981]',
    badge: 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40',
    saveBtn: 'bg-[#10B981]/20 border-[#10B981] text-[#10B981] hover:bg-[#10B981]/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]',
  },
  WARNING: {
    color: '#F59E0B',
    bg: 'bg-[#F59E0B]/15',
    border: 'border-[#F59E0B]/50',
    text: 'text-[#F59E0B]',
    badge: 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40',
    saveBtn: 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B] hover:bg-[#F59E0B]/30 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
  },
  NO_FLY: {
    color: '#EF4444',
    bg: 'bg-[#EF4444]/15',
    border: 'border-[#EF4444]/50',
    text: 'text-[#EF4444]',
    badge: 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/40',
    saveBtn: 'bg-[#EF4444]/20 border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/30 shadow-[0_0_12px_rgba(239,68,68,0.25)]',
  },
  INCLUSION: {
    color: '#3B82F6',
    bg: 'bg-[#3B82F6]/15',
    border: 'border-[#3B82F6]/50',
    text: 'text-[#3B82F6]',
    badge: 'bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]/40',
    saveBtn: 'bg-[#3B82F6]/20 border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6]/30 shadow-[0_0_12px_rgba(59,130,246,0.25)]',
  },
  EXCLUSION: {
    color: '#EF4444',
    bg: 'bg-[#EF4444]/15',
    border: 'border-[#EF4444]/50',
    text: 'text-[#EF4444]',
    badge: 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/40',
    saveBtn: 'bg-[#EF4444]/20 border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/30 shadow-[0_0_12px_rgba(239,68,68,0.25)]',
  },
};

  const handleSave = () => {
    const minAlt = Number(altMin);
    const maxAlt = Number(altMax);
    const rad = Number(radius);
    const width = Number(corridorWidth);
    const prio = Number(priority);

    // 1. Update local reactive store immediately
    updateGeofence(selectedGf.id, {
      name: name.trim() || selectedGf.name,
      zone_type: zoneType,
      altitude_min: minAlt,
      altitude_max: maxAlt,
      priority: prio,
      radius: rad,
      corridor_width: width,
    });

    // 2. Broadcast authoritative update to backend
    commandManager.sendCommand('geofence.update', {
      geofence_id: selectedGf.id,
      name: name.trim() || selectedGf.name,
      zone_type: zoneType,
      geometry_type: selectedGf.geometry_type,
      altitude_min: minAlt,
      altitude_max: maxAlt,
      priority: prio,
      radius: rad,
      corridor_width: width,
      coordinates: selectedGf.coordinates,
      center: selectedGf.center,
      enabled: selectedGf.enabled,
      visible: selectedGf.visible,
    });

    // 3. Trigger immediate map layer re-render
    const updatedGfs = useGeofenceStore.getState().geofences;
    mapController.geofenceLayer.updateGeofences(updatedGfs, selectedGf.id);

    // 4. Show visual feedback badge
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const theme = ZONE_THEMES[zoneType] ?? ZONE_THEMES.NO_FLY;

  return (
    <div className={`bg-[#11171E] border ${theme.border} rounded-lg p-3 font-mono text-xs space-y-3 select-none transition-colors duration-200`}>
      <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
        <div className="flex items-center space-x-1.5 font-bold" style={{ color: theme.color }}>
          <Edit3 className="w-3.5 h-3.5" style={{ color: theme.color }} />
          <span>EDIT GEOFENCE ZONE</span>
          <span className={`text-[9px] px-1.5 py-0.2 rounded border font-mono ${theme.badge}`}>
            {zoneType}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] text-[#707C88] hidden sm:inline">{selectedGf.id.slice(0, 8)}</span>
          <button
            type="button"
            onClick={() => {
              clearSelection();
              mapController.geofenceLayer.clearHandles();
            }}
            className="p-1 rounded bg-[#1B2530] hover:bg-[#2B3743] text-[#707C88] hover:text-[#E7EBEF] transition"
            title="Deselect & Hide Dots (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <label className="text-[10px] text-[#707C88] block mb-1">ZONE NAME</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[#0B0F14] border border-[#2B3743] rounded px-2 py-1 text-[#E7EBEF] text-xs focus:border-[#5B8FB9] focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-[#707C88] block mb-1">ZONE TYPE</label>
            <select
              value={zoneType}
              onChange={(e) => {
                const newType = e.target.value as ZoneType;
                setZoneType(newType);
                // Also optimistically update store & map immediately so color changes live as you select!
                updateGeofence(selectedGf.id, { zone_type: newType });
                const updatedGfs = useGeofenceStore.getState().geofences;
                mapController.geofenceLayer.updateGeofences(updatedGfs, selectedGf.id);
              }}
              className={`w-full bg-[#0B0F14] border ${theme.border} rounded px-2 py-1 font-bold text-xs focus:outline-none`}
              style={{ color: theme.color }}
            >
              <option value="SAFE">SAFE (GREEN)</option>
              <option value="WARNING">WARNING (AMBER)</option>
              <option value="NO_FLY">NO FLY (RED)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-[#707C88] block mb-1">ALT MIN (m)</label>
            <input
              type="number"
              value={altMin}
              onChange={(e) => setAltMin(Number(e.target.value))}
              className="w-full bg-[#0B0F14] border border-[#2B3743] rounded px-2 py-1 text-[#E7EBEF] text-xs focus:border-[#5B8FB9] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] text-[#707C88] block mb-1">ALT MAX (m)</label>
            <input
              type="number"
              value={altMax}
              onChange={(e) => setAltMax(Number(e.target.value))}
              className="w-full bg-[#0B0F14] border border-[#2B3743] rounded px-2 py-1 text-[#E7EBEF] text-xs focus:border-[#5B8FB9] focus:outline-none"
            />
          </div>
        </div>

        {selectedGf.geometry_type === 'CIRCLE' && (
          <div>
            <label className="text-[10px] text-[#707C88] block mb-1">RADIUS (meters)</label>
            <input
              type="number"
              value={radius}
              onChange={(e) => setRadius(Math.max(10, Number(e.target.value)))}
              className="w-full bg-[#0B0F14] border border-[#2B3743] rounded px-2 py-1 text-[#E7EBEF] text-xs focus:border-[#5B8FB9] focus:outline-none"
            />
          </div>
        )}

        {selectedGf.geometry_type === 'CORRIDOR' && (
          <div>
            <label className="text-[10px] text-[#707C88] block mb-1">CORRIDOR WIDTH (meters)</label>
            <input
              type="number"
              value={corridorWidth}
              onChange={(e) => setCorridorWidth(Math.max(5, Number(e.target.value)))}
              className="w-full bg-[#0B0F14] border border-[#2B3743] rounded px-2 py-1 text-[#E7EBEF] text-xs focus:border-[#5B8FB9] focus:outline-none"
            />
          </div>
        )}

        <div>
          <label className="text-[10px] text-[#707C88] block mb-1">PRIORITY LEVEL (1–5)</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`flex-1 py-1 rounded border text-[10px] font-bold transition ${
                  priority === p
                    ? `${theme.bg} ${theme.border} ${theme.text}`
                    : 'bg-[#0B0F14] border-[#2B3743] text-[#707C88] hover:text-[#E7EBEF] hover:bg-[#151D26]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-2">
        <button
          onClick={handleSave}
          className={`flex-1 py-2 rounded border font-bold transition flex items-center justify-center space-x-2 active:scale-95 ${
            isSaved
              ? 'bg-[#10B981]/25 border-[#10B981] text-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse'
              : theme.saveBtn
          }`}
        >
          {isSaved ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              <span>{zoneType} APPLIED!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>APPLY {zoneType}</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            handleSave();
            clearSelection();
            mapController.geofenceLayer.clearHandles();
          }}
          className="px-4 py-2 rounded border border-[#10B981]/60 bg-[#10B981]/15 hover:bg-[#10B981]/25 text-[#10B981] font-bold text-xs transition flex items-center justify-center space-x-1.5 active:scale-95 shadow"
          title="Save changes, finish editing, and hide vertex dots"
        >
          <Check className="w-4 h-4" />
          <span>DONE</span>
        </button>
      </div>
    </div>
  );
});
