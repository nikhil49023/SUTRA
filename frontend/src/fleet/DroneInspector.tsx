import React from 'react';
import { useFleetStore } from '../stores/fleetStore';
import { useSelectionStore } from '../stores/selectionStore';
import { wsClient } from '../communication/WebSocketClient';
import { Radio, ShieldAlert, Navigation, Compass, Battery } from 'lucide-react';
import { formatCoordinates } from '../utils/formatting';

export const DroneInspector: React.FC = () => {
  const { drones, leader_id } = useFleetStore();
  const { selected_type, selected_id } = useSelectionStore();

  const drone = selected_type === 'DRONE' ? drones[selected_id || ''] : null;

  if (!drone) return null;

  const isLeader = drone.drone_id === leader_id || drone.is_leader;

  const handleRtlDrone = () => {
    wsClient.sendCommand('EMERGENCY_RTL', { drone_id: drone.drone_id });
  };

  return (
    <div className="bg-[#0f141c]/90 border border-slate-800 rounded-lg p-3 font-mono text-xs space-y-3 select-none">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-1.5 font-bold text-cyan-300">
          <Radio className="w-3.5 h-3.5" />
          <span>DRONE TELEMETRY: {drone.callsign}</span>
        </div>
        {isLeader && (
          <span className="px-1.5 py-0.2 rounded bg-amber-950 border border-amber-400 text-amber-300 text-[10px] font-bold">
            ★ SWARM LEADER
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
          <span className="text-[10px] text-slate-400">POSITION (LAT/LON)</span>
          <div className="font-bold text-slate-200 mt-0.5 tabular-nums text-[10px]">
            {formatCoordinates(drone.latitude, drone.longitude)}
          </div>
        </div>

        <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
          <span className="text-[10px] text-slate-400">ALTITUDE / SPEED</span>
          <div className="font-bold text-cyan-300 mt-0.5 tabular-nums">
            {drone.altitude.toFixed(1)}m · {drone.speed.toFixed(1)}m/s
          </div>
        </div>

        <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
          <span className="text-[10px] text-slate-400">HEADING / ATTITUDE</span>
          <div className="font-bold text-slate-200 mt-0.5 tabular-nums">
            {drone.heading.toFixed(0)}° (P:{drone.pitch.toFixed(0)}° R:{drone.roll.toFixed(0)}°)
          </div>
        </div>

        <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
          <span className="text-[10px] text-slate-400">BATTERY / LINK</span>
          <div className="font-bold text-emerald-400 mt-0.5 tabular-nums">
            {drone.battery.toFixed(0)}% · {drone.connection_status}
          </div>
        </div>
      </div>

      {/* Target offset if follower */}
      {!isLeader && drone.offset_x !== undefined && drone.offset_y !== undefined && (
        <div className="bg-slate-900/60 p-2 rounded border border-slate-800 flex justify-between items-center text-[11px]">
          <span className="text-slate-400">FORMATION SETPOINT OFFSET:</span>
          <span className="font-bold text-cyan-300 tabular-nums">
            ΔX: {drone.offset_x.toFixed(0)}m, ΔY: {drone.offset_y.toFixed(0)}m
          </span>
        </div>
      )}

      {/* Individual Emergency RTL Button */}
      <button
        onClick={handleRtlDrone}
        className="w-full py-1.5 rounded bg-rose-950/70 border border-rose-500/50 hover:bg-rose-900 text-rose-200 font-bold transition flex items-center justify-center space-x-1.5"
      >
        <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
        <span>COMMAND {drone.callsign} RTL</span>
      </button>
    </div>
  );
};
