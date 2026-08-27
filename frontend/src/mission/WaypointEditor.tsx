import React, { useState, useEffect, memo } from 'react';
import { useMissionStore } from '../stores/missionStore';
import { useSelectionStore } from '../stores/selectionStore';
import { commandManager } from '../communication/CommandManager';
import { WaypointAction } from '../types/mission';
import { Edit3, Trash2, Check, X } from 'lucide-react';

export const WaypointEditor: React.FC = memo(() => {
  const waypoints = useMissionStore((s) => s.waypoints);
  const selectedId = useSelectionStore((s) => s.selected_id);
  const clearSelection = useSelectionStore((s) => s.clearSelection);

  const waypoint = waypoints.find((w) => w.id === selectedId || String(w.index) === selectedId);

  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [alt, setAlt] = useState('');
  const [speed, setSpeed] = useState('');
  const [action, setAction] = useState<WaypointAction>('NAVIGATE');
  const [holdTime, setHoldTime] = useState('0');

  useEffect(() => {
    if (waypoint) {
      setLat(waypoint.latitude.toString());
      setLon(waypoint.longitude.toString());
      setAlt(waypoint.altitude.toString());
      setSpeed(waypoint.speed.toString());
      setAction(waypoint.action || 'NAVIGATE');
      setHoldTime((waypoint.hold_time || 0).toString());
    }
  }, [waypoint]);

  if (!waypoint) {
    return (
      <div className="p-4 text-center font-mono text-xs text-[#707C88] bg-[#11171E] rounded-lg border border-[#2B3743]">
        Select a waypoint on the map or list to edit properties.
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const oldWp = { ...waypoint };

    commandManager.sendCommand('mission.update_waypoint', {
      waypoint_id: waypoint.id,
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      altitude: parseFloat(alt),
      speed: parseFloat(speed),
      action,
      hold_time: parseFloat(holdTime),
    }, {
      onRollback: () => {
        setLat(oldWp.latitude.toString());
        setLon(oldWp.longitude.toString());
        setAlt(oldWp.altitude.toString());
        setSpeed(oldWp.speed.toString());
      },
    });
  };

  const handleDelete = () => {
    commandManager.sendCommand('mission.delete_waypoint', { waypoint_id: waypoint.id });
    clearSelection();
  };

  return (
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 font-mono text-xs space-y-3 select-none">
      <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
        <div className="flex items-center space-x-1.5 font-bold text-[#E7EBEF]">
          <Edit3 className="w-3.5 h-3.5 text-[#5B8FB9]" />
          <span>EDIT WAYPOINT #{waypoint.index}</span>
        </div>
        <button
          onClick={handleDelete}
          className="p-1 rounded text-[#C75A5A] hover:bg-[#1B2530] transition"
          title="Delete Waypoint"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-[#707C88] block mb-0.5">LATITUDE (°)</label>
            <input
              type="number"
              step="0.000001"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="w-full bg-[#0B0F14] border border-[#2B3743] rounded px-2 py-1 text-[#E7EBEF] text-xs focus:border-[#5B8FB9] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] text-[#707C88] block mb-0.5">LONGITUDE (°)</label>
            <input
              type="number"
              step="0.000001"
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              className="w-full bg-[#0B0F14] border border-[#2B3743] rounded px-2 py-1 text-[#E7EBEF] text-xs focus:border-[#5B8FB9] focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-[#707C88] block mb-0.5">ALTITUDE (m AGL)</label>
            <input
              type="number"
              step="1"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              className="w-full bg-[#0B0F14] border border-[#2B3743] rounded px-2 py-1 text-[#E7EBEF] text-xs focus:border-[#5B8FB9] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] text-[#707C88] block mb-0.5">SPEED (m/s)</label>
            <input
              type="number"
              step="0.5"
              value={speed}
              onChange={(e) => setSpeed(e.target.value)}
              className="w-full bg-[#0B0F14] border border-[#2B3743] rounded px-2 py-1 text-[#E7EBEF] text-xs focus:border-[#5B8FB9] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2 pt-2 border-t border-[#2B3743]">
          <button
            type="submit"
            className="flex-1 py-1.5 rounded bg-[#1B2530] border border-[#5B8FB9]/60 hover:border-[#5B8FB9] hover:bg-[#223040] text-[#E7EBEF] font-bold flex items-center justify-center space-x-1 transition active:scale-95"
          >
            <Check className="w-3.5 h-3.5 text-[#4F9A72]" />
            <span>SAVE WAYPOINT</span>
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="px-3 py-1.5 rounded bg-[#151D26] border border-[#2B3743] hover:bg-[#1B2530] hover:text-[#E7EBEF] text-[#707C88] transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
});
