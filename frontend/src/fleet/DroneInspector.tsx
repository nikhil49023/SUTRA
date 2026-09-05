import React, { memo } from 'react';
import { useFleetStore } from '../stores/fleetStore';
import { useSelectionStore } from '../stores/selectionStore';
import { wsClient } from '../communication/WebSocketClient';
import { Radio, ShieldAlert, Star } from 'lucide-react';
import { formatCoordinates } from '../utils/formatting';
import { DroneCameraFeed } from './DroneCameraFeed';

export const DroneInspector: React.FC = memo(() => {
  const selectedId = useSelectionStore((s) => s.selected_id);
  const selectedType = useSelectionStore((s) => s.selected_type);
  const drones = useFleetStore((s) => s.drones);
  const leaderId = useFleetStore((s) => s.leader_id);
  const setLeader = useFleetStore((s) => s.setLeader);

  const drone = selectedType === 'DRONE' && selectedId ? drones[selectedId] : null;

  if (!drone) return null;

  const isLeader = drone.drone_id === leaderId || drone.is_leader;

  const handlePromoteLeader = () => {
    setLeader(drone.drone_id);
  };

  const handleRtlDrone = () => {
    wsClient.sendCommand('EMERGENCY_RTL', { drone_id: drone.drone_id });
  };

  return (
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 font-mono text-xs space-y-3 select-none">
      <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
        <div className="flex items-center space-x-1.5 font-bold text-[#5B8FB9]">
          <Radio className="w-3.5 h-3.5" />
          <span>DRONE TELEMETRY: {drone.callsign}</span>
        </div>
        {isLeader ? (
          <span className="px-1.5 py-0.2 rounded bg-[#1B2530] border border-[#C49A4A] text-[#C49A4A] text-[10px] font-bold shadow-[0_0_8px_rgba(196,154,74,0.3)]">
            ★ SWARM LEADER
          </span>
        ) : (
          <button
            onClick={handlePromoteLeader}
            className="px-2 py-0.5 rounded bg-[#151D26] hover:bg-[#C49A4A] hover:text-[#0B0F14] border border-[#C49A4A]/60 text-[#C49A4A] text-[10px] font-bold transition flex items-center space-x-1 active:scale-95"
          >
            <Star className="w-3 h-3 fill-current" />
            <span>MAKE LEADER</span>
          </button>
        )}
      </div>

      {/* Live Drone Camera Feed with Deep JSCC telemetry */}
      <DroneCameraFeed droneId={drone.drone_id} callsign={drone.callsign} />

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="bg-[#151D26] p-2 rounded border border-[#2B3743]">
          <span className="text-[10px] text-[#707C88]">POSITION (LAT/LON)</span>
          <div className="font-bold text-[#E7EBEF] mt-0.5 tabular-nums text-[10px]">
            {formatCoordinates(drone.latitude, drone.longitude)}
          </div>
        </div>

        <div className="bg-[#151D26] p-2 rounded border border-[#2B3743]">
          <span className="text-[10px] text-[#707C88]">ALTITUDE / SPEED</span>
          <div className="font-bold text-[#5B8FB9] mt-0.5 tabular-nums">
            {drone.altitude.toFixed(1)}m · {drone.speed.toFixed(1)}m/s
          </div>
        </div>

        <div className="bg-[#151D26] p-2 rounded border border-[#2B3743]">
          <span className="text-[10px] text-[#707C88]">HEADING / ATTITUDE</span>
          <div className="font-bold text-[#E7EBEF] mt-0.5 tabular-nums">
            {drone.heading.toFixed(0)}° (P:{drone.pitch.toFixed(0)}° R:{drone.roll.toFixed(0)}°)
          </div>
        </div>

        <div className="bg-[#151D26] p-2 rounded border border-[#2B3743]">
          <span className="text-[10px] text-[#707C88]">BATTERY / LINK</span>
          <div className="font-bold text-[#4F9A72] mt-0.5 tabular-nums">
            {drone.battery.toFixed(0)}% · {drone.connection_status}
          </div>
        </div>
      </div>

      {/* Target offset if follower */}
      {!isLeader && drone.offset_x !== undefined && drone.offset_y !== undefined && (
        <div className="bg-[#151D26] p-2 rounded border border-[#2B3743] flex justify-between items-center text-[11px]">
          <span className="text-[#707C88]">FORMATION SETPOINT OFFSET:</span>
          <span className="font-bold text-[#5B8FB9] tabular-nums">
            ΔX: {drone.offset_x.toFixed(0)}m, ΔY: {drone.offset_y.toFixed(0)}m
          </span>
        </div>
      )}

      <div className="flex items-center space-x-2">
        {!isLeader && (
          <button
            onClick={handlePromoteLeader}
            className="flex-1 py-1.5 rounded bg-[#1B2530] border border-[#C49A4A]/60 hover:bg-[#C49A4A] hover:text-[#0B0F14] text-[#C49A4A] font-bold transition flex items-center justify-center space-x-1.5 active:scale-95"
          >
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>PROMOTE TO LEADER</span>
          </button>
        )}
        <button
          onClick={handleRtlDrone}
          className={`${isLeader ? 'w-full' : 'flex-1'} py-1.5 rounded bg-[#1B2530] border border-[#C75A5A]/60 hover:bg-[#C75A5A] hover:text-white text-[#C75A5A] font-bold transition flex items-center justify-center space-x-1.5 active:scale-95`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>COMMAND {drone.callsign.split(' ')[0]} RTL</span>
        </button>
      </div>
    </div>
  );
});
