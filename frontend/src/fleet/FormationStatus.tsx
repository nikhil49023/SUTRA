import React from 'react';
import { useFleetStore } from '../stores/fleetStore';
import { commandManager } from '../communication/CommandManager';
import { Crosshair, Plus, Trash2 } from 'lucide-react';

export const FormationStatus: React.FC = () => {
  const { drones, formation, spacing, selectedDroneId, setSelectedDroneId } = useFleetStore();
  const droneList = Object.values(drones);
  const droneCount = droneList.length;

  // Calculate moving, target counts and distance to target
  let movingCount = 0;
  let targetsAssigned = 0;
  let totalDev = 0;

  const droneDetails = droneList.map((d) => {
    const hasTarget = Boolean(d.target_latitude && d.target_longitude);
    if (hasTarget) targetsAssigned++;

    const dLat = (d.target_latitude ?? d.latitude) - d.latitude;
    const dLon = ((d.target_longitude ?? d.longitude) - d.longitude) * Math.cos((d.latitude * Math.PI) / 180);
    const distToTargetMeters = Math.sqrt(dLat * dLat + dLon * dLon) * 111139;

    if (d.speed > 0.1 || distToTargetMeters > 0.5) movingCount++;
    totalDev += distToTargetMeters;

    return {
      ...d,
      hasTarget,
      distToTargetMeters,
      status: distToTargetMeters < 1.0 ? 'LOCKED' : 'HOLDING/EN ROUTE',
    };
  });

  const avgDev = totalDev / Math.max(1, droneCount);
  const integrityPct = Math.max(0, Math.min(100, Math.round(100 - avgDev * 5)));

  const handleAddDrone = () => {
    const nextCallsigns = ['ECHO (SCAN)', 'FOXTROT (RELAY)', 'GOLF (ESCORT)', 'HOTEL (RECON)'];
    const idx = droneCount;
    const callsign = nextCallsigns[idx % nextCallsigns.length];
    const droneId = `drone_${callsign.split(' ')[0].toLowerCase()}`;
    commandManager.sendCommand('fleet.add_drone', {
      drone_id: droneId,
      callsign,
      role: 'WINGMAN',
    });
  };

  const handleRemoveDrone = (droneId: string) => {
    if (droneCount <= 1) return;
    commandManager.sendCommand('fleet.remove_drone', { drone_id: droneId });
  };

  return (
    <div className="bg-[#11171E] border border-[#2B3743] rounded-lg p-3 sm:p-4 font-mono text-xs space-y-3 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2B3743] pb-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-[#151D26] border border-[#5B8FB9]/40 flex items-center justify-center">
            <Crosshair className="w-3.5 h-3.5 text-[#5B8FB9]" />
          </div>
          <div>
            <span className="font-bold text-[#E7EBEF]">SWARM KINEMATICS & TARGET TRACKING</span>
            <span className="text-[10px] text-[#707C88] ml-2">// ORCA 3D SEPARATION</span>
          </div>
        </div>
        <button
          onClick={handleAddDrone}
          className="px-2.5 py-1 rounded bg-[#151D26] hover:bg-[#1B2530] border border-[#5B8FB9]/50 text-[#5B8FB9] hover:text-[#E7EBEF] text-[10px] font-bold flex items-center space-x-1.5 transition"
          title="Spawn additional UAV into swarm"
        >
          <Plus className="w-3 h-3" />
          <span>ADD UAV</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
        <div className="bg-[#151D26] p-2 rounded border border-[#2B3743]">
          <span className="text-[#707C88] block">FORMATION</span>
          <span className="font-bold text-[#C49A4A] text-xs mt-0.5">{formation}</span>
        </div>

        <div className="bg-[#151D26] p-2 rounded border border-[#2B3743]">
          <span className="text-[#707C88] block">MOVING UAVs</span>
          <span className="font-bold text-[#4F9A72] text-xs mt-0.5 tabular-nums">
            {movingCount}/{droneCount} Active
          </span>
        </div>

        <div className="bg-[#151D26] p-2 rounded border border-[#2B3743]">
          <span className="text-[#707C88] block">TARGETS</span>
          <span className="font-bold text-[#5B8FB9] text-xs mt-0.5 tabular-nums">
            {targetsAssigned}/{droneCount} Assigned
          </span>
        </div>

        <div className="bg-[#151D26] p-2 rounded border border-[#2B3743]">
          <span className="text-[#707C88] block">INTEGRITY</span>
          <span className="font-bold text-[#4F9A72] text-xs mt-0.5 tabular-nums">{integrityPct}%</span>
        </div>
      </div>

      {/* Per-Drone Trajectory Table */}
      <div className="space-y-1.5">
        <div className="text-[10px] text-[#707C88] font-bold px-1 flex justify-between uppercase">
          <span>UAV / Role / Location</span>
          <span>Target Delta / Speed</span>
        </div>

        <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-0.5">
          {droneDetails.map((d) => {
            const isSelected = selectedDroneId === d.drone_id;
            return (
              <div
                key={d.drone_id}
                onClick={() => setSelectedDroneId(d.drone_id)}
                className={`p-2 rounded-lg border text-[10px] flex items-center justify-between cursor-pointer transition ${
                  isSelected
                    ? 'bg-[#1B2530] border-[#5B8FB9] text-[#E7EBEF]'
                    : 'bg-[#151D26] border-[#2B3743] text-[#A9B3BD] hover:border-[#3A4856]'
                }`}
              >
                <div className="flex flex-col">
                  <div className="font-bold flex items-center space-x-1.5">
                    <span className={d.is_leader ? 'text-[#C49A4A]' : 'text-[#E7EBEF]'}>
                      {d.is_leader ? '★ ' : ''}
                      {d.callsign}
                    </span>
                    <span className="text-[9px] text-[#707C88] font-normal">({d.role})</span>
                  </div>
                  <div className="text-[9px] text-[#707C88] tabular-nums mt-0.5">
                    {d.latitude.toFixed(5)}, {d.longitude.toFixed(5)} ({d.altitude.toFixed(0)}m)
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="font-bold text-[#4F9A72] tabular-nums">
                      Δ {d.distToTargetMeters.toFixed(1)}m
                    </div>
                    <div className="text-[9px] text-[#707C88] tabular-nums">
                      {d.speed.toFixed(1)} m/s · {d.battery.toFixed(0)}%
                    </div>
                  </div>

                  {!d.is_leader && droneCount > 2 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveDrone(d.drone_id);
                      }}
                      className="p-1 text-[#707C88] hover:text-[#C75A5A] hover:bg-[#11171E] rounded transition"
                      title="Remove UAV from formation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
