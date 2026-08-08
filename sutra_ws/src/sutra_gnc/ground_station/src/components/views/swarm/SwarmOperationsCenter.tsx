import React, { useState } from 'react';
import { 
  Users, 
  Layers, 
  ShieldAlert, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  Zap, 
  Compass, 
  Sliders, 
  Radio, 
  RotateCcw,
  Maximize2,
  Grid,
  Play
} from 'lucide-react';

import { 
  SwarmManager, 
  DroneRegistry, 
  TaskAllocator, 
  CollisionAvoidanceEngine, 
  LeaderElectionEngine, 
  SwarmAnalyticsEngine,
  swarmStateMachine
} from '../../../swarm';

import type { FormationType } from '../../../swarm/FormationTypes';
import { useFleetStore } from '../../../store/FleetStore';
import type { DroneAsset, Waypoint } from '../../../types';
import type { SwarmAnalyticsSummary, CollisionRisk } from '../../../swarm/types';

interface SwarmOperationsCenterProps {
  activeDrone: DroneAsset;
  waypoints: Waypoint[];
  drones: DroneAsset[];
}

export const SwarmOperationsCenter: React.FC<SwarmOperationsCenterProps> = ({
  activeDrone,
  waypoints,
  drones
}) => {
  const [activeTab, setActiveTab] = useState<'FLEET' | 'FORMATION' | 'TASKS' | 'HEALTH' | 'MISSION' | 'ANALYTICS'>('FLEET');
  const { formationConfig, setFormation, setSpacing, setLeader } = useFleetStore();

  // Sync Registry with prop drones
  DroneRegistry.syncFromDroneAssets(drones);

  const swarmNodes = SwarmManager.getNodes();
  const leaderNode = SwarmManager.getLeaderNode();
  const backupLeader = SwarmManager.getBackupLeaderNode();
  const analytics: SwarmAnalyticsSummary = SwarmAnalyticsEngine.computeSummary();
  const conflicts: CollisionRisk[] = CollisionAvoidanceEngine.auditProximity();

  const handleSetFormation = (pattern: FormationType) => {
    setFormation(pattern);
  };

  const handleSpacingChange = (val: number) => {
    setSpacing(val);
  };

  const handleElectLeader = () => {
    const res = LeaderElectionEngine.electNewLeader();
    if (res) {
      setLeader(res.newLeader.droneId);
    }
  };

  const allFormations: { id: FormationType; label: string }[] = [
    { id: 'LINE', label: 'Line' },
    { id: 'COLUMN', label: 'Column' },
    { id: 'V_FORMATION', label: 'V-Shape' },
    { id: 'DIAMOND', label: 'Diamond' },
    { id: 'ECHELON_LEFT', label: 'Echelon L' },
    { id: 'ECHELON_RIGHT', label: 'Echelon R' },
    { id: 'CIRCLE', label: 'Circle' },
    { id: 'GRID', label: 'Grid' },
    { id: 'CUSTOM', label: 'Custom' }
  ];

  return (
    <div className="flex flex-col h-full w-full bg-[#050811] text-slate-200 font-mono select-none overflow-hidden relative">
      {/* 1. TOP TITLE BAR */}
      <header className="h-12 bg-[#080d1a] border-b border-[#1b253b] px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 rounded bg-cyan-500/20 border border-cyan-400 flex items-center justify-center">
            <Users className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          </div>
          <span className="font-bold text-sm text-white tracking-wider">MULTI-DRONE SWARM COORDINATION SYSTEM</span>
          <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold uppercase">
            SWARM STATE: {swarmStateMachine.getState()}
          </span>
        </div>

        {/* SUB-PANEL SELECTORS */}
        <div className="flex items-center space-x-1 bg-[#050914] p-1 rounded-lg border border-[#1b253b] text-xs">
          {(
            [
              { id: 'FLEET', label: 'Fleet Grid' },
              { id: 'FORMATION', label: 'Formations' },
              { id: 'TASKS', label: 'Task Allocation' },
              { id: 'HEALTH', label: 'Fleet Health' },
              { id: 'MISSION', label: 'Cooperative Mission' },
              { id: 'ANALYTICS', label: 'Swarm Analytics' }
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* 2. MAIN BODY CONTENT */}
      <div className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
        {/* TAB 1: FLEET DASHBOARD */}
        {activeTab === 'FLEET' && (
          <div className="space-y-4">
            <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-sm tracking-wider uppercase">ACTIVE SWARM FLEET REGISTRY ({swarmNodes.length} NODES)</h3>
                <p className="text-xs text-slate-400">Primary Leader: {leaderNode?.callsign || 'N/A'} | Backup: {backupLeader?.callsign || 'N/A'}</p>
              </div>

              <button
                onClick={handleElectLeader}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-cyan-600/20"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ELECT NEW LEADER</span>
              </button>
            </div>

            {/* NODES GRID */}
            <div className="grid grid-cols-3 gap-4">
              {swarmNodes.map((node) => (
                <div key={node.droneId} className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl space-y-2 relative group hover:border-cyan-500/80 transition-all">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${node.isLeader ? 'bg-cyan-400 animate-ping' : 'bg-emerald-400'}`} />
                      <span className="font-bold text-sm text-white">{node.callsign} ({node.droneId})</span>
                    </div>
                    {node.isLeader && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                        LEADER
                      </span>
                    )}
                  </div>

                  <div className="text-xs space-y-1 text-slate-400 pt-1">
                    <div className="flex justify-between"><span>Battery:</span><span className="text-emerald-400 font-bold">{node.batteryPercent}%</span></div>
                    <div className="flex justify-between"><span>Position:</span><span className="text-slate-200 font-mono">{node.lat.toFixed(4)} N, {node.lng.toFixed(4)} E</span></div>
                    <div className="flex justify-between"><span>Altitude / Speed:</span><span className="text-cyan-400">{node.altitudeAGLM}m / {node.speedKmh} km/h</span></div>
                    <div className="flex justify-between"><span>Payload:</span><span className="text-slate-300">{node.payloadType}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: FORMATION CONTROL PANEL */}
        {activeTab === 'FORMATION' && (
          <div className="space-y-4">
            <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl space-y-3">
              <div>
                <h3 className="text-white font-bold text-sm tracking-wider uppercase">SWARM FORMATION ENGINE CONTROL</h3>
                <p className="text-xs text-slate-400">Select geometry layout to immediately animate followers at 60 FPS.</p>
              </div>

              {/* 9 FORMATION BUTTONS */}
              <div className="grid grid-cols-5 gap-2 pt-1">
                {allFormations.map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => handleSetFormation(fmt.id)}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center space-x-1.5 ${
                      formationConfig.type === fmt.id
                        ? 'bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-600/30'
                        : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>{fmt.label}</span>
                  </button>
                ))}
              </div>

              {/* SPACING SLIDER & LEADER SELECTION */}
              <div className="flex items-center space-x-6 pt-3 border-t border-slate-800 text-xs">
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between text-slate-300 font-bold">
                    <span>INTER-NODE SPACING</span>
                    <span className="text-cyan-400">{formationConfig.spacingMeters} meters</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={formationConfig.spacingMeters}
                    onChange={(e) => handleSpacingChange(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                <div className="w-64 space-y-1">
                  <span className="text-slate-300 font-bold block">FORMATION LEADER</span>
                  <select
                    value={formationConfig.leaderId}
                    onChange={(e) => setLeader(e.target.value)}
                    className="w-full bg-[#040710] border border-slate-700 rounded px-2.5 py-1 text-white font-bold outline-none"
                  >
                    {drones.map((d) => (
                      <option key={d.id} value={d.id}>{d.callsign} ({d.id})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl grid grid-cols-3 gap-4 text-xs">
              <div><span className="text-slate-400 font-bold block">ACTIVE GEOMETRY</span><span className="text-xl font-bold text-cyan-400">{formationConfig.type}</span></div>
              <div><span className="text-slate-400 font-bold block">SPACING & LEADER</span><span className="text-xl font-bold text-white">{formationConfig.spacingMeters}m ({formationConfig.leaderId})</span></div>
              <div><span className="text-slate-400 font-bold block">FORMATION INTEGRITY</span><span className="text-xl font-bold text-emerald-400">{analytics.formationIntegrityPercent}%</span></div>
            </div>
          </div>
        )}

        {/* TAB 3: TASK ALLOCATION */}
        {activeTab === 'TASKS' && (
          <div className="space-y-4">
            <h3 className="text-white font-bold text-sm tracking-wider uppercase">DYNAMIC MULTI-UAV TASK ALLOCATION</h3>
            <div className="space-y-2">
              {waypoints.map((wp, idx) => {
                const alloc = TaskAllocator.allocateTask(`task-wp-${wp.id}`, wp.lat, wp.lng);
                return (
                  <div key={wp.id} className="bg-[#070d1a] border border-[#1b253b] p-3.5 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3">
                      <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center font-bold text-[10px]">{idx + 1}</span>
                      <div>
                        <span className="font-bold text-white block">Waypoint Task #{wp.id} ({wp.lat.toFixed(4)} N, {wp.lng.toFixed(4)} E)</span>
                        <span className="text-slate-400 text-[11px]">{alloc.reason}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-emerald-400 font-bold">Assigned: {alloc.assignedDroneId}</span>
                      <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-bold">{alloc.suitabilityScore}/100</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: FLEET HEALTH */}
        {activeTab === 'HEALTH' && (
          <div className="space-y-4">
            <h3 className="text-white font-bold text-sm tracking-wider uppercase">FLEET HEALTH & COLLISION AUDIT</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl">
                <span className="text-xs text-slate-400 font-bold block">AVG FLEET BATTERY</span>
                <span className="text-2xl font-bold text-emerald-400">{analytics.avgBatteryPercent} %</span>
              </div>
              <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl">
                <span className="text-xs text-slate-400 font-bold block">MESH HEALTH INDEX</span>
                <span className="text-2xl font-bold text-cyan-400">{analytics.meshHealthPercent} %</span>
              </div>
              <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl">
                <span className="text-xs text-slate-400 font-bold block">PROXIMITY CONFLICTS</span>
                <span className="text-2xl font-bold text-amber-400">{conflicts.length} Active</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: COOPERATIVE MISSION */}
        {activeTab === 'MISSION' && (
          <div className="space-y-4">
            <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-sm tracking-wider uppercase">COOPERATIVE PARALLEL MISSION EXECUTION</h3>
                <p className="text-xs text-slate-400">Synchronized multi-UAV path execution and recovery manager.</p>
              </div>

              <button
                onClick={() => swarmStateMachine.transitionTo('EXECUTING_MISSION')}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>START COOPERATIVE SWARM</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 6: SWARM ANALYTICS */}
        {activeTab === 'ANALYTICS' && (
          <div className="space-y-4">
            <h3 className="text-white font-bold text-sm tracking-wider uppercase">SWARM FLEET UTILIZATION ANALYTICS</h3>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl">
                <span className="text-slate-400 font-bold block">FLEET UTILIZATION</span>
                <span className="text-2xl font-bold text-cyan-400">{analytics.fleetUtilizationPercent}%</span>
              </div>
              <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl">
                <span className="text-slate-400 font-bold block">AREA COVERAGE</span>
                <span className="text-2xl font-bold text-emerald-400">{analytics.areaCoverageKm2} km²</span>
              </div>
              <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl">
                <span className="text-slate-400 font-bold block">ACTIVE NODE COUNT</span>
                <span className="text-2xl font-bold text-white">{analytics.activeDroneCount} UAVs</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
