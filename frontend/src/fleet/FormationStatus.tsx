import React from 'react';
import { useFleetStore } from '../stores/fleetStore';
import { commandManager } from '../communication/CommandManager';
import { ShieldCheck, Crosshair, Activity, Plus, Trash2 } from 'lucide-react';

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
    <div className="bg-[#0f141c]/90 border border-slate-800 rounded-lg p-3 font-mono text-xs space-y-2.5 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
        <div className="flex items-center space-x-1.5 font-bold text-slate-200">
          <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
          <span>SWARM KINEMATICS & TARGET TRACKING</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={handleAddDrone}
            className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/60 hover:bg-cyan-900 text-cyan-300 text-[10px] flex items-center space-x-1"
            title="Spawn additional UAV into swarm"
          >
            <Plus className="w-3 h-3" />
            <span>ADD UAV</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-1.5 text-[10px]">
        <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
          <span className="text-slate-400 block">FORMATION</span>
          <span className="font-bold text-amber-400">{formation}</span>
        </div>

        <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
          <span className="text-slate-400 block">MOVING UAVs</span>
          <span className="font-bold text-emerald-400 tabular-nums">
            {movingCount}/{droneCount} Active
          </span>
        </div>

        <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
          <span className="text-slate-400 block">TARGETS</span>
          <span className="font-bold text-cyan-300 tabular-nums">
            {targetsAssigned}/{droneCount} Assigned
          </span>
        </div>

        <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
          <span className="text-slate-400 block">INTEGRITY</span>
          <span className="font-bold text-emerald-300 tabular-nums">{integrityPct}%</span>
        </div>
      </div>

      {/* Per-Drone Trajectory Table */}
      <div className="space-y-1">
        <div className="text-[10px] text-slate-400 font-bold px-1 flex justify-between">
          <span>UAV / ROLE</span>
          <span>DIST TO TARGET / SPEED</span>
        </div>

        <div className="max-h-40 overflow-y-auto space-y-1 pr-0.5">
          {droneDetails.map((d) => {
            const isSelected = selectedDroneId === d.drone_id;
            return (
              <div
                key={d.drone_id}
                onClick={() => setSelectedDroneId(d.drone_id)}
                className={`p-1.5 rounded border text-[10px] flex items-center justify-between cursor-pointer transition ${
                  isSelected
                    ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col">
                  <div className="font-bold flex items-center space-x-1">
                    <span className={d.is_leader ? 'text-amber-400' : 'text-slate-200'}>
                      {d.is_leader ? '★ ' : ''}
                      {d.callsign}
                    </span>
                    <span className="text-[9px] text-slate-500 font-normal">({d.role})</span>
                  </div>
                  <div className="text-[9px] text-slate-400 tabular-nums">
                    {d.latitude.toFixed(5)}, {d.longitude.toFixed(5)} ({d.altitude.toFixed(0)}m)
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <div className="font-bold text-emerald-400 tabular-nums">
                      Δ {d.distToTargetMeters.toFixed(1)}m
                    </div>
                    <div className="text-[9px] text-slate-400 tabular-nums">
                      {d.speed.toFixed(1)} m/s · {d.battery.toFixed(0)}%
                    </div>
                  </div>

                  {!d.is_leader && droneCount > 2 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveDrone(d.drone_id);
                      }}
                      className="p-1 text-slate-600 hover:text-rose-400 rounded"
                      title="Remove UAV from formation"
                    >
                      <Trash2 className="w-3 h-3" />
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
