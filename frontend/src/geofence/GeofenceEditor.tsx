import React, { useState, useEffect } from 'react';
import { useGeofenceStore } from '../stores/geofenceStore';
import { useSelectionStore } from '../stores/selectionStore';
import { commandManager } from '../communication/CommandManager';
import { ZoneType } from '../types/geofence';
import { Edit3, Save, ShieldAlert } from 'lucide-react';

export const GeofenceEditor: React.FC = () => {
  const { geofences, updateGeofence } = useGeofenceStore();
  const { selected_type, selected_id } = useSelectionStore();

  const selectedGf =
    selected_type === 'GEOFENCE' ? geofences.find((g) => g.id === selected_id) : null;

  const [name, setName] = useState('');
  const [zoneType, setZoneType] = useState<ZoneType>('NO_FLY');
  const [altMin, setAltMin] = useState(0);
  const [altMax, setAltMax] = useState(120);

  useEffect(() => {
    if (selectedGf) {
      setName(selectedGf.name);
      setZoneType(selectedGf.zone_type);
      setAltMin(selectedGf.altitude_min);
      setAltMax(selectedGf.altitude_max);
    }
  }, [selectedGf]);

  if (!selectedGf) return null;

  const handleSave = () => {
    updateGeofence(selectedGf.id, {
      name,
      zone_type: zoneType,
      altitude_min: altMin,
      altitude_max: altMax,
    });
    commandManager.sendCommand('geofence.update', {
      geofence_id: selectedGf.id,
      name,
      zone_type: zoneType,
      altitude_min: altMin,
      altitude_max: altMax,
    });
  };

  return (
    <div className="bg-[#0f141c]/90 border border-slate-800 rounded-lg p-3 font-mono text-xs space-y-3 select-none">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-1.5 font-bold text-cyan-300">
          <Edit3 className="w-3.5 h-3.5" />
          <span>EDIT GEOFENCE ZONE</span>
        </div>
        <span className="text-[10px] text-slate-500">{selectedGf.id}</span>
      </div>

      <div className="space-y-2">
        <div>
          <label className="text-[10px] text-slate-400 block mb-1">ZONE NAME</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:ring-1 focus:ring-cyan-400"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">ZONE TYPE</label>
            <select
              value={zoneType}
              onChange={(e) => setZoneType(e.target.value as ZoneType)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:ring-1 focus:ring-cyan-400"
            >
              <option value="NO_FLY">NO FLY</option>
              <option value="WARNING">WARNING</option>
              <option value="SAFE">SAFE</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1">ALT MIN (m)</label>
            <input
              type="number"
              value={altMin}
              onChange={(e) => setAltMin(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1">ALT MAX (m)</label>
            <input
              type="number"
              value={altMax}
              onChange={(e) => setAltMax(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:ring-1 focus:ring-cyan-400"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full mt-2 py-1.5 rounded bg-cyan-900/60 border border-cyan-500/50 hover:bg-cyan-800 text-cyan-200 font-bold transition flex items-center justify-center space-x-1.5"
      >
        <Save className="w-3.5 h-3.5" />
        <span>APPLY GEOFENCE CHANGES</span>
      </button>
    </div>
  );
};
