import React, { useState, useEffect, memo } from 'react';
import { useGeofenceStore } from '../stores/geofenceStore';
import { useSelectionStore } from '../stores/selectionStore';
import { commandManager } from '../communication/CommandManager';
import { mapController } from '../map/MapController';
import { ZoneType } from '../types/geofence';
import { Edit3, Save, CheckCircle2 } from 'lucide-react';

export const GeofenceEditor: React.FC = memo(() => {
  const geofences = useGeofenceStore((s) => s.geofences);
  const updateGeofence = useGeofenceStore((s) => s.updateGeofence);
  const selectedType = useSelectionStore((s) => s.selected_type);
  const selectedId = useSelectionStore((s) => s.selected_id);

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

  if (!selectedGf) return null;

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

    // 3. Close editing dots/handles and clear selection
    mapController.geofenceLayer.clearHandles();
    useSelectionStore.getState().clearSelection();
  };

  return (
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 font-mono text-xs space-y-3 select-none">
      <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
        <div className="flex items-center space-x-1.5 font-bold text-[#5B8FB9]">
          <Edit3 className="w-3.5 h-3.5" />
          <span>EDIT GEOFENCE ZONE</span>
        </div>
        <span className="text-[10px] text-[#707C88]">{selectedGf.id}</span>
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
              onChange={(e) => setZoneType(e.target.value as ZoneType)}
              className="w-full bg-[#0B0F14] border border-[#2B3743] rounded px-2 py-1 text-[#E7EBEF] text-xs focus:border-[#5B8FB9] focus:outline-none"
            >
              <option value="NO_FLY">NO FLY</option>
              <option value="WARNING">WARNING</option>
              <option value="SAFE">SAFE</option>
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
                    ? 'bg-[#1B2530] border-[#5B8FB9] text-[#5B8FB9]'
                    : 'bg-[#0B0F14] border-[#2B3743] text-[#707C88] hover:text-[#E7EBEF] hover:bg-[#151D26]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className={`w-full mt-2 py-1.5 rounded border font-bold transition flex items-center justify-center space-x-1.5 active:scale-95 ${
          isSaved
            ? 'bg-[#4F9A72]/20 border-[#4F9A72] text-[#4F9A72]'
            : 'bg-[#1B2530] border-[#5B8FB9]/60 hover:bg-[#223040] hover:border-[#5B8FB9] text-[#E7EBEF]'
        }`}
      >
        {isSaved ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#4F9A72]" />
            <span>CHANGES APPLIED!</span>
          </>
        ) : (
          <>
            <Save className="w-3.5 h-3.5 text-[#4F9A72]" />
            <span>APPLY GEOFENCE CHANGES</span>
          </>
        )}
      </button>
    </div>
  );
});
