import React from 'react';
import { useFleetStore } from '../stores/fleetStore';
import { useSelectionStore } from '../stores/selectionStore';
import { wsClient } from '../communication/WebSocketClient';
import { DroneState } from '../types/fleet';
import { Radio, Battery, Activity } from 'lucide-react';

export const DroneList: React.FC = () => {
  const { drones, leader_id, setLeader } = useFleetStore();
  const { selected_type, selected_id, selectDrone } = useSelectionStore();

  const handleSelect = (drone: DroneState) => {
    selectDrone(drone.drone_id);
    wsClient.sendCommand('FLEET_SELECT_DRONE', { drone_id: drone.drone_id });
  };

  const handleSetLeader = (e: React.MouseEvent, droneId: string) => {
    e.stopPropagation();
    setLeader(droneId);
    wsClient.sendCommand('FLEET_SET_LEADER', { leader_id: droneId });
  };

  const droneList = Object.values(drones);

  return (
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg overflow-hidden flex flex-col font-mono text-xs select-none">
      <div className="bg-[#151D26] px-3 sm:px-4 py-2.5 border-b border-[#2B3743] flex justify-between items-center text-[#E7EBEF] font-bold">
        <div className="flex items-center space-x-2">
          <Radio className="w-3.5 h-3.5 text-[#5B8FB9]" />
          <span>SWARM FLEET REGISTRY ({droneList.length})</span>
        </div>
        <span className="text-[10px] text-[#707C88] font-normal">CLICK TO INSPECT / CLICK ★ TO PROMOTE</span>
      </div>

      <div className="divide-y divide-[#2B3743]/60 max-h-80 overflow-y-auto custom-scrollbar">
        {droneList.map((drone) => {
          const isSelected = selected_type === 'DRONE' && selected_id === drone.drone_id;
          const isLeader = drone.drone_id === leader_id || drone.is_leader;
          const isLowBat = drone.battery <= 20;

          return (
            <div
              key={drone.drone_id}
              onClick={() => handleSelect(drone)}
              className={`p-3 flex items-center justify-between cursor-pointer transition ${
                isSelected
                  ? 'bg-[#1B2530] border-l-4 border-l-[#5B8FB9] text-[#E7EBEF]'
                  : 'hover:bg-[#151D26] text-[#A9B3BD]'
              }`}
            >
              <div className="flex items-center space-x-3">
                {/* Role / Leader Icon */}
                <button
                  onClick={(e) => handleSetLeader(e, drone.drone_id)}
                  title={isLeader ? 'Active Swarm Leader' : 'Promote to Swarm Leader'}
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border transition ${
                    isLeader
                      ? 'bg-[#C49A4A] text-[#0B0F14] border-[#E7EBEF] shadow-[0_0_8px_rgba(196,154,74,0.5)]'
                      : 'bg-[#151D26] border-[#2B3743] text-[#707C88] hover:text-[#C49A4A] hover:border-[#C49A4A]'
                  }`}
                >
                  {isLeader ? '★' : drone.formation_index}
                </button>

                <div>
                  <div className="font-bold text-xs flex items-center space-x-1.5 text-[#E7EBEF]">
                    <span>{drone.callsign}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#151D26] border border-[#2B3743] text-[#707C88]">
                      {drone.role}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#707C88] mt-0.5 tabular-nums">
                    ALT: <span className="text-[#A9B3BD]">{drone.altitude.toFixed(0)}m</span> · SPD: <span className="text-[#A9B3BD]">{drone.speed.toFixed(1)}m/s</span> · HDG: <span className="text-[#A9B3BD]">{drone.heading.toFixed(0)}°</span>
                  </div>
                </div>
              </div>

              {/* Battery & Status */}
              <div className="flex flex-col items-end space-y-1 flex-shrink-0">
                <div className="flex items-center space-x-1">
                  <Battery className={`w-3.5 h-3.5 ${isLowBat ? 'text-[#C75A5A]' : 'text-[#4F9A72]'}`} />
                  <span className={`font-bold tabular-nums ${isLowBat ? 'text-[#C75A5A]' : 'text-[#4F9A72]'}`}>
                    {drone.battery.toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-[9px] text-[#707C88]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F9A72] animate-pulse" />
                  <span className="text-[#A9B3BD] font-bold">{drone.flight_mode}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
