import React from 'react';
import { 
  Activity, 
  ShieldCheck, 
  Wifi, 
  Cpu, 
  HardDrive, 
  Radio, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Terminal, 
  Sliders, 
  Server,
  Layers,
  Zap,
  Globe
} from 'lucide-react';

import { HealthMonitor, PerformanceMonitor } from '../../../monitoring';
import { ConfigManager, FeatureFlags } from '../../../config';
import { AuthService, AuditTrail } from '../../../security';
import { Logger } from '../../../logging';
import type { DroneAsset, Waypoint } from '../../../types';

interface OperationsCenterViewProps {
  activeDrone: DroneAsset;
  drones: DroneAsset[];
  waypoints: Waypoint[];
}

export const OperationsCenterView: React.FC<OperationsCenterViewProps> = ({
  activeDrone,
  drones,
  waypoints
}) => {
  const config = ConfigManager.getConfig();
  const session = AuthService.getSession();
  const metrics = PerformanceMonitor.getMetrics();
  const health = HealthMonitor.getSystemStatus();
  const auditLogs = AuditTrail.getLogs();
  const systemLogs = Logger.getLogs();

  return (
    <div className="flex flex-col h-full w-full bg-[#050811] text-slate-200 font-mono select-none overflow-hidden relative p-4 space-y-4">
      {/* 1. TOP STATS BAR */}
      <div className="grid grid-cols-5 gap-4 shrink-0">
        <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
            <span>SYSTEM HEALTH</span>
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">{health.status}</div>
          <div className="text-[10px] text-slate-500 font-bold">CPU LOAD: {health.cpuLoadPercent}%</div>
        </div>

        <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
            <span>CONNECTED FLEET</span>
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-white">{drones.length} UAVs</div>
          <div className="text-[10px] text-slate-500 font-bold">ACTIVE LEADER: {drones[0]?.callsign || 'N/A'}</div>
        </div>

        <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
            <span>NETWORK & LATENCY</span>
            <Wifi className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-cyan-400">{metrics.network.latencyMs} ms</div>
          <div className="text-[10px] text-slate-500 font-bold">LOSS: {metrics.network.packetLossPercent}% ({metrics.network.wsStatus})</div>
        </div>

        <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
            <span>PERFORMANCE & MEM</span>
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-purple-400">{metrics.fps} FPS</div>
          <div className="text-[10px] text-slate-500 font-bold">RAM: {metrics.memory.usedHeapMB} / {metrics.memory.totalHeapMB} MB</div>
        </div>

        <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
            <span>BUILD & VERSION</span>
            <Server className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-sm font-bold text-amber-400">{config.version}</div>
          <div className="text-[10px] text-slate-500 font-bold">BUILD: {config.buildNumber}</div>
        </div>
      </div>

      {/* 2. MIDDLE TWO-COLUMN PANELS */}
      <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
        {/* LEFT COLUMN: SECURITY & AUDIT TRAIL */}
        <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl flex flex-col overflow-hidden">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800 shrink-0">
            <span className="font-bold text-xs text-white tracking-wider flex items-center space-x-2">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>RBAC SECURITY & OPERATOR AUDIT TRAIL</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
              ROLE: {session?.role} ({session?.username})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pt-3 space-y-2 text-xs scrollbar-thin scrollbar-thumb-slate-800">
            {auditLogs.length === 0 ? (
              <div className="text-slate-500 text-center py-6">No security audit records logged.</div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-2 bg-[#040710] border border-slate-800/80 rounded flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-200 block">{log.action}</span>
                    <span className="text-slate-400 text-[10px]">{log.targetResource} • IP: {log.ipAddress}</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: FEATURE FLAGS & CONFIGURATION */}
        <div className="bg-[#070d1a] border border-[#1b253b] p-4 rounded-xl flex flex-col overflow-hidden">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800 shrink-0">
            <span className="font-bold text-xs text-white tracking-wider flex items-center space-x-2">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>PRODUCTION FEATURE FLAGS & ENVIRONMENT</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
              ENV: {config.environment.toUpperCase()}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pt-3 space-y-2 text-xs scrollbar-thin scrollbar-thumb-slate-800">
            {[
              { flag: 'ENABLE_AI_RECOMMENDATIONS', desc: 'Real-time AI Decision Support Engine' },
              { flag: 'ENABLE_SWARM_COORDINATION', desc: 'Multi-UAV Mesh Swarm Manager' },
              { flag: 'ENABLE_RTSP_VIDEO_FEED', desc: 'Multi-Camera RTSP Gateway' },
              { flag: 'ENABLE_3D_DEM_TERRAIN', desc: 'Digital Elevation Model Spatial Engine' },
              { flag: 'ENABLE_GEOFENCE_SAFETY', desc: 'Geofence Safety Boundary Guard' }
            ].map((item) => (
              <div key={item.flag} className="p-2.5 bg-[#040710] border border-slate-800/80 rounded flex justify-between items-center">
                <div>
                  <span className="font-bold text-white block">{item.flag}</span>
                  <span className="text-slate-400 text-[10px]">{item.desc}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                  ACTIVE
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
