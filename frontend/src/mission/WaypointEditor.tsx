import React, { useState, useEffect } from 'react';
import { useMissionStore } from '../stores/missionStore';
import { useSelectionStore } from '../stores/selectionStore';
import { commandManager } from '../communication/CommandManager';
import { WaypointAction } from '../types/mission';
import { Edit3, Trash2, Check, X } from 'lucide-react';

export const WaypointEditor: React.FC = () => {
  const { waypoints } = useMissionStore();
  const { selected_id, clearSelection } = useSelectionStore();

  const waypoint = waypoints.find((w) => w.id === selected_id);

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
      <div className="p-4 text-center font-mono text-xs text-slate-500">
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
        // Rollback form to old waypoint values
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
    <div className="bg-[#0f141c]/90 border border-slate-800 rounded-lg p-3 font-mono text-xs space-y-3 select-none">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-1.5 font-bold text-slate-200">
          <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
          <span>EDIT WAYPOINT #{waypoint.index}</span>
        </div>
        <button
          onClick={handleDelete}
          className="p-1 rounded text-rose-400 hover:bg-rose-950/50"
          title="Delete Waypoint"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">LATITUDE (°)</label>
            <input
              type="number"
              step="0.000001"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">LONGITUDE (°)</label>
            <input
              type="number"
              step="0.000001"
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:ring-1 focus:ring-cyan-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">ALTITUDE (m AGL)</label>
            <input
              type="number"
              step="1"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">SPEED (m/s)</label>
            <input
              type="number"
              step="0.5"
              value={speed}
              onChange={(e) => setSpeed(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:ring-1 focus:ring-cyan-400"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2 pt-2 border-t border-slate-800">
          <button
            type="submit"
            className="flex-1 py-1.5 rounded bg-cyan-950 border border-cyan-500/50 hover:bg-cyan-900 text-cyan-200 font-bold flex items-center justify-center space-x-1"
          >
            <Check className="w-3.5 h-3.5" />
            <span>SAVE WAYPOINT</span>
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-400"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};
