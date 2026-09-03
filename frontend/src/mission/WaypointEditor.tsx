/**
 * Smart Horizon GCS — Tactical Waypoint Property Editor & Direct Setpoint Dispatcher
 */

import React, { useState, useEffect, memo } from 'react';
import { useMissionStore } from '../stores/missionStore';
import { useSelectionStore } from '../stores/selectionStore';
import { commandManager } from '../communication/CommandManager';
import { WaypointAction } from '../types/mission';
import { Edit3, Trash2, Check, Navigation, Send, CornerDownRight } from 'lucide-react';

export const WaypointEditor: React.FC = memo(() => {
  const waypoints = useMissionStore((s) => s.waypoints);
  const activeWaypointIndex = useMissionStore((s) => s.active_waypoint_index);
  const selectedId = useSelectionStore((s) => s.selected_id);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const updateWaypoint = useMissionStore((s) => s.updateWaypoint);
  const deleteWaypoint = useMissionStore((s) => s.deleteWaypoint);

  const waypoint = waypoints.find(
    (w) => String(w.id) === String(selectedId) || String(w.index) === String(selectedId)
  );

  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [alt, setAlt] = useState('');
  const [speed, setSpeed] = useState('');
  const [action, setAction] = useState<WaypointAction>('NAVIGATE');
  const [holdTime, setHoldTime] = useState('0');
  const [acceptanceRadius, setAcceptanceRadius] = useState('2');

  useEffect(() => {
    if (waypoint) {
      setLat(waypoint.latitude.toString());
      setLon(waypoint.longitude.toString());
      setAlt(waypoint.altitude.toString());
      setSpeed(waypoint.speed.toString());
      setAction(waypoint.action || 'NAVIGATE');
      setHoldTime((waypoint.hold_time || 0).toString());
      setAcceptanceRadius((waypoint.acceptance_radius || 2).toString());
    }
  }, [waypoint]);

  if (!waypoint) {
    return (
      <div className="p-6 text-center font-mono text-xs text-[#707C88] bg-[#11171E] rounded-lg border border-[#2B3743] shadow-md space-y-2">
        <div className="w-8 h-8 rounded-full bg-[#151D26] border border-[#2B3743] flex items-center justify-center mx-auto text-[#5B8FB9]">
          <CornerDownRight className="w-4 h-4" />
        </div>
        <div className="font-bold text-[#E7EBEF]">NO WAYPOINT SELECTED</div>
        <div className="text-[11px] text-[#707C88]">
          Click any waypoint marker on the 3D map or list to inspect and tune its flight parameters.
        </div>
      </div>
    );
  }

  const isPassed = waypoint.index < activeWaypointIndex;
  const isActive = waypoint.index === activeWaypointIndex;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const wpId = waypoint.id || waypoint.index;
    updateWaypoint(wpId, {
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      altitude: parseFloat(alt),
      speed: parseFloat(speed),
      action,
      hold_time: parseFloat(holdTime),
      acceptance_radius: parseFloat(acceptanceRadius),
    });
  };

  const handleDelete = () => {
    deleteWaypoint(waypoint.id || waypoint.index);
    clearSelection();
  };

  const handleFlyHereNow = () => {
    commandManager.sendCommand('drone.goto', {
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      altitude: parseFloat(alt),
      speed: parseFloat(speed),
    });
  };

  return (
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 font-mono text-xs space-y-3 select-none shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
        <div className="flex items-center space-x-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
            isActive
              ? 'bg-[#10B981] text-white animate-pulse'
              : isPassed
              ? 'bg-[#064E3B] text-[#34D399]'
              : 'bg-[#5B8FB9] text-[#0B0F14]'
          }`}>
            {waypoint.index}
          </div>
          <div>
            <span className="font-extrabold text-[#E7EBEF] text-xs">EDIT WAYPOINT #{waypoint.index}</span>
            {isActive && (
              <span className="text-[9px] text-[#10B981] font-bold ml-1.5">[ACTIVE TARGET]</span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={handleFlyHereNow}
            className="px-2 py-1 rounded bg-[#5B8FB9]/20 hover:bg-[#5B8FB9]/30 text-[#5B8FB9] hover:text-white border border-[#5B8FB9]/50 font-bold text-[10px] flex items-center space-x-1 transition"
            title="Command drone to immediately navigate to this waypoint"
          >
            <Send className="w-3 h-3" />
            <span>FLY HERE</span>
          </button>

          <button
            onClick={handleDelete}
            className="p-1 rounded text-[#EF4444] hover:bg-[#EF4444]/20 transition"
            title="Delete Waypoint"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editor Form */}
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

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-[#707C88] block mb-0.5">ALT AGL (m)</label>
            <input
              type="number"
              step="1"
              min="2"
              max="500"
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
              min="1"
              max="25"
              value={speed}
              onChange={(e) => setSpeed(e.target.value)}
              className="w-full bg-[#0B0F14] border border-[#2B3743] rounded px-2 py-1 text-[#E7EBEF] text-xs focus:border-[#5B8FB9] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] text-[#707C88] block mb-0.5">HOLD (s)</label>
            <input
              type="number"
              step="1"
              min="0"
              value={holdTime}
              onChange={(e) => setHoldTime(e.target.value)}
              className="w-full bg-[#0B0F14] border border-[#2B3743] rounded px-2 py-1 text-[#E7EBEF] text-xs focus:border-[#5B8FB9] focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-[#707C88] block mb-0.5">ACTION</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as WaypointAction)}
              className="w-full bg-[#0B0F14] border border-[#2B3743] rounded px-2 py-1 text-[#E7EBEF] text-xs focus:border-[#5B8FB9] focus:outline-none"
            >
              <option value="NAVIGATE">NAVIGATE (Fly Through)</option>
              <option value="HOLD">HOLD (Loiter at WP)</option>
              <option value="SURVEY">SURVEY (Sensor Capture)</option>
              <option value="LAND">LAND (Precision Descent)</option>
              <option value="RTL">RTL (Return to Launch)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-[#707C88] block mb-0.5">ACCEPT RADIUS (m)</label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="20"
              value={acceptanceRadius}
              onChange={(e) => setAcceptanceRadius(e.target.value)}
              className="w-full bg-[#0B0F14] border border-[#2B3743] rounded px-2 py-1 text-[#E7EBEF] text-xs focus:border-[#5B8FB9] focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-1.5 rounded bg-[#5B8FB9] hover:bg-[#4B7FA9] text-[#0B0F14] font-extrabold flex items-center justify-center space-x-1.5 transition active:scale-98 shadow-sm"
        >
          <Check className="w-3.5 h-3.5 stroke-[3]" />
          <span>APPLY WAYPOINT CHANGES</span>
        </button>
      </form>
    </div>
  );
});
