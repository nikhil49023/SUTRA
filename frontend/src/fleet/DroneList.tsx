import React from 'react';
import { useFleetStore } from '../stores/fleetStore';
import { useSelectionStore } from '../stores/selectionStore';
import { wsClient } from '../communication/WebSocketClient';
import { DroneState } from '../types/fleet';
import { Radio, Battery, Activity, ShieldAlert, Star } from 'lucide-react';

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

  return (
    <div className="bg-[#0f141c]/90 border border-slate-800 rounded-lg overflow-hidden flex flex-col font-mono text-xs select-none">
      <div className="bg-slate-900/80 px-3 py-2 border-b border-slate-800 flex justify-between items-center text-slate-300 font-bold">
        <div className="flex items-center space-x-1.5">
          <Radio className="w-3.5 h-3.5 text-cyan-400" />
          <span>SWARM FLEET REGISTRY ({Object.keys(drones).length})</span>
        </div>
      </div>

      <div className="divide-y divide-slate-800/80 max-h-72 overflow-y-auto">
        {Object.values(drones).map((drone) => {
          const isSelected = selected_type === 'DRONE' && selected_id === drone.drone_id;
          const isLeader = drone.drone_id === leader_id || drone.is_leader;

          return (
            <div
              key={drone.drone_id}
              onClick={() => handleSelect(drone)}
              className={`p-3 flex items-center justify-between cursor-pointer transition ${
                isSelected
                  ? 'bg-cyan-950/60 border-l-4 border-l-cyan-400 text-cyan-200'
                  : 'hover:bg-slate-800/40 text-slate-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                {/* Role / Leader Icon */}
                <button
                  onClick={(e) => handleSetLeader(e, drone.drone_id)}
                  title={isLeader ? 'Swarm Leader' : 'Promote to Leader'}
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border ${
                    isLeader
                      ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-amber-300'
                  }`}
                >
                  {isLeader ? '★' : drone.formation_index}
                </button>

                <div>
                  <div className="font-bold text-xs flex items-center space-x-1.5">
                    <span>{drone.callsign}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-slate-400">
                      {drone.role}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                    ALT: {drone.altitude.toFixed(0)}m · SPD: {drone.speed.toFixed(1)}m/s · HDG: {drone.heading.toFixed(0)}°
                  </div>
                </div>
              </div>

              {/* Battery & Status */}
              <div className="flex flex-col items-end space-y-1">
                <div className="flex items-center space-x-1">
                  <Battery className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-bold tabular-nums text-emerald-400">
                    {drone.battery.toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-[9px] text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{drone.flight_mode}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
