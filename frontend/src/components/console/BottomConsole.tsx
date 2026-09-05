import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useAlertStore } from '../../stores/alertStore';
import { useCommunicationStore } from '../../stores/communicationStore';
import { useMissionStore } from '../../stores/missionStore';
import { useFleetStore } from '../../stores/fleetStore';
import { useAIStore } from '../../stores/aiStore';
import { useCameraStore } from '../../stores/cameraStore';
import { useGeofenceNotificationStore } from '../../geofence/GeofenceNotificationStore';
import { formatTimestamp } from '../../utils/formatting';
import { NavigationSection } from '../../types/app';
import {
  Terminal,
  Trash2,
  Pause,
  Play,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Radio,
  Route,
  Shield,
  Wifi,
  Brain,
  Cpu,
} from 'lucide-react';

interface ConsoleLogItem {
  id: string;
  time: number;
  topic: 'TELEMETRY' | 'MISSION' | 'SAFETY' | 'COMMUNICATION' | 'AI' | 'SYSTEM';
  msg: string;
  level: 'INFO' | 'WARN' | 'CRITICAL';
}

const TAB_SECTION_MAPPING: Record<
  'TELEMETRY' | 'MISSION' | 'SAFETY' | 'COMMUNICATION' | 'AI' | 'SYSTEM',
  NavigationSection
> = {
  TELEMETRY: 'FLEET',
  MISSION: 'MISSION',
  SAFETY: 'GEOFENCE',
  COMMUNICATION: 'SETTINGS',
  AI: 'AI',
  SYSTEM: 'COMMAND',
};

const TAB_ICONS: Record<string, any> = {
  TELEMETRY: Radio,
  MISSION: Route,
  SAFETY: Shield,
  COMMUNICATION: Wifi,
  AI: Brain,
  SYSTEM: Cpu,
};

export const BottomConsole: React.FC = () => {
  const {
    isConsoleOpen,
    toggleConsole,
    activeConsoleTab,
    setActiveConsoleTab,
    setActiveSection,
  } = useAppStore();

  const alerts = useAlertStore((s) => s.alerts);
  const { messages_received, messages_sent, bytes_received, latency_ms } = useCommunicationStore();
  const waypoints = useMissionStore((s) => s.waypoints);
  const missionProgress = useMissionStore((s) => s.mission_progress);
  const drones = useFleetStore((s) => s.drones);
  const trackedTargets = useAIStore((s) => s.tracked_targets);
  const activeWorld = useCameraStore((s) => s.activeWorld);
  const gfAlerts = useGeofenceNotificationStore((s) => s.notifications);

  const worldTargets = useMemo(() => {
    return (trackedTargets || []).filter((t) => (t.world_id || 'WORLD_1') === activeWorld);
  }, [trackedTargets, activeWorld]);

  const [isPaused, setIsPaused] = useState(false);
  const [logs, setLogs] = useState<ConsoleLogItem[]>([
    {
      id: 'init-1',
      time: Date.now() - 30000,
      topic: 'COMMUNICATION',
      msg: 'WebSocket gateway connected (ws://127.0.0.1:8765) @ 10 Hz telemetry frequency.',
      level: 'INFO',
    },
    {
      id: 'init-2',
      time: Date.now() - 25000,
      topic: 'MISSION',
      msg: 'Authoritative flight state synchronized. Alpha recon setpoints loaded.',
      level: 'INFO',
    },
    {
      id: 'init-3',
      time: Date.now() - 20000,
      topic: 'TELEMETRY',
      msg: '4 active swarm UAVs reporting 3D GPS Fix and nominal battery voltage (25.2V).',
      level: 'INFO',
    },
    {
      id: 'init-4',
      time: Date.now() - 15000,
      topic: 'SAFETY',
      msg: 'ORCA 3D Safety Buffer active. Perimeter containment bounds loaded.',
      level: 'INFO',
    },
  ]);

  // Append geofence & safety notifications
  useEffect(() => {
    if (gfAlerts.length > 0 && !isPaused) {
      const latest = gfAlerts[0];
      setLogs((prev) => [
        {
          id: `gf-${latest.id}-${Date.now()}`,
          time: Date.now(),
          topic: 'SAFETY',
          msg: `${latest.drone_name || latest.drone_id}: ${latest.message} (${latest.geofence_name})`,
          level: latest.severity === 'CRITICAL_RED_ZONE' ? 'CRITICAL' : 'WARN',
        },
        ...prev.slice(0, 99),
      ]);
    }
  }, [gfAlerts, isPaused]);

  // Append AI target perception alerts
  useEffect(() => {
    if (worldTargets && worldTargets.length > 0 && !isPaused) {
      const latest = worldTargets[0];
      setLogs((prev) => [
        {
          id: `target-${latest.target_id}-${Date.now()}`,
          time: Date.now(),
          topic: 'AI',
          msg: `Target detected: ${latest.label} (${(latest.confidence * 100).toFixed(0)}% conf) at [${latest.latitude.toFixed(4)}, ${latest.longitude.toFixed(4)}]`,
          level: 'INFO',
        },
        ...prev.slice(0, 99),
      ]);
    }
  }, [worldTargets, isPaused]);

  // Filter logs by active tab
  const filteredLogs = useMemo(() => {
    if (activeConsoleTab === 'SYSTEM') {
      return logs;
    }
    return logs.filter((l) => l.topic === activeConsoleTab);
  }, [logs, activeConsoleTab]);

  const handleTabClick = (tab: 'TELEMETRY' | 'MISSION' | 'SAFETY' | 'COMMUNICATION' | 'AI' | 'SYSTEM') => {
    setActiveConsoleTab(tab);
    const targetSection = TAB_SECTION_MAPPING[tab];
    if (targetSection) {
      setActiveSection(targetSection);
    }
  };

  const handleClear = () => setLogs([]);

  if (!isConsoleOpen) {
    return (
      <button
        onClick={toggleConsole}
        className="h-7 bg-[#0B0F14] border-t border-[#2B3743] px-4 flex items-center justify-between text-[11px] font-mono text-[#707C88] hover:text-[#5B8FB9] select-none z-30 transition hover:bg-[#11171E] flex-shrink-0"
      >
        <div className="flex items-center space-x-2">
          <Terminal className="w-3.5 h-3.5 text-[#5B8FB9]" />
          <span className="font-bold tracking-wide">SYSTEM EVENT CONSOLE & TELEMETRY STREAM</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] text-[#707C88]">[{filteredLogs.length} events]</span>
          <ChevronUp className="w-3.5 h-3.5" />
        </div>
      </button>
    );
  }

  return (
    <div className="h-44 bg-[#0B0F14]/98 border-t border-[#2B3743] flex flex-col font-mono text-xs select-none z-30 shadow-2xl flex-shrink-0">
      {/* Console Tab Header */}
      <div className="h-9 flex items-center justify-between px-3 bg-[#11171E] border-b border-[#2B3743] flex-shrink-0">
        <div className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto">
          <div className="flex items-center space-x-1.5 mr-2 text-[#707C88] font-bold text-[10px]">
            <Terminal className="w-3.5 h-3.5 text-[#5B8FB9]" />
            <span className="hidden md:inline">STREAM:</span>
          </div>

          {(['TELEMETRY', 'MISSION', 'SAFETY', 'COMMUNICATION', 'AI', 'SYSTEM'] as const).map((tab) => {
            const isActive = activeConsoleTab === tab;
            const Icon = TAB_ICONS[tab] || Terminal;
            return (
              <button
                key={tab}
                data-testid={`console-tab-${tab}`}
                onClick={() => handleTabClick(tab)}
                className={`px-2.5 py-1 rounded text-[10px] font-bold border transition flex items-center space-x-1.5 active:scale-95 ${
                  isActive
                    ? 'bg-[#1B2530] border-[#5B8FB9] text-[#E7EBEF] shadow-[0_0_8px_rgba(91,143,185,0.3)]'
                    : 'border-transparent text-[#707C88] hover:text-[#E7EBEF] hover:bg-[#151D26] hover:border-[#2B3743]'
                }`}
                title={`Click to switch stream and open ${TAB_SECTION_MAPPING[tab]} panel`}
              >
                <Icon className={`w-3 h-3 ${isActive ? 'text-[#5B8FB9]' : 'text-[#707C88]'}`} />
                <span>{tab}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-60 ml-0.5" />
              </button>
            );
          })}
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`p-1.5 rounded text-[#707C88] hover:text-[#E7EBEF] transition hover:bg-[#151D26] ${
              isPaused ? 'text-[#C49A4A] font-bold bg-[#1B2530]' : ''
            }`}
            title={isPaused ? 'Resume Logging' : 'Pause Logging'}
          >
            {isPaused ? <Play className="w-3 h-3 text-[#4F9A72]" /> : <Pause className="w-3 h-3" />}
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 rounded text-[#707C88] hover:text-[#C75A5A] transition hover:bg-[#151D26]"
            title="Clear Console Logs"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <button
            onClick={toggleConsole}
            className="p-1.5 rounded text-[#707C88] hover:text-[#E7EBEF] transition hover:bg-[#151D26]"
            title="Minimize Console"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Live Stream Status Summary Bar */}
      <div className="bg-[#151D26] px-3 py-1 border-b border-[#2B3743] flex items-center justify-between text-[10px] text-[#707C88]">
        <div className="flex items-center space-x-3">
          <span>
            ACTIVE STREAM: <strong className="text-[#5B8FB9]">{activeConsoleTab}</strong>
          </span>
          {activeConsoleTab === 'TELEMETRY' && (
            <span>DRONES: <strong className="text-[#E7EBEF]">{Object.keys(drones).length} Active</strong></span>
          )}
          {activeConsoleTab === 'MISSION' && (
            <span>WAYPOINTS: <strong className="text-[#E7EBEF]">{waypoints.length} Setpoints ({missionProgress.toFixed(0)}%)</strong></span>
          )}
          {activeConsoleTab === 'SAFETY' && (
            <span>ALERTS: <strong className="text-[#C75A5A]">{gfAlerts.length} Warnings</strong></span>
          )}
          {activeConsoleTab === 'COMMUNICATION' && (
            <span>MSGS: <strong className="text-[#4F9A72]">Rx: {messages_received} | Tx: {messages_sent} ({latency_ms}ms)</strong></span>
          )}
          {activeConsoleTab === 'AI' && (
            <span>DETECTIONS: <strong className="text-[#5B8FB9]">{worldTargets.length} Fused Targets</strong></span>
          )}
        </div>
        <div className="text-[9px] text-[#707C88]">
          CLICK ANY TAB TO OPEN ASSOCIATED PANEL & FILTER STREAM
        </div>
      </div>

      {/* Log Output Area */}
      <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] space-y-1 bg-[#0B0F14] custom-scrollbar">
        {filteredLogs.length === 0 ? (
          <div className="text-[#707C88] italic p-2 text-center text-[10px]">
            No {activeConsoleTab} events recorded in buffer yet. Active listener ready.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-center space-x-2.5 hover:bg-[#11171E] px-1.5 py-0.5 rounded transition"
            >
              <span className="text-[#707C88] tabular-nums flex-shrink-0 text-[10px]">
                {formatTimestamp(log.time)}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-[#151D26] border border-[#2B3743] text-[9px] text-[#5B8FB9] font-bold flex-shrink-0">
                {log.topic}
              </span>
              <span
                className={`px-1 py-0.2 rounded text-[9px] font-bold flex-shrink-0 ${
                  log.level === 'CRITICAL'
                    ? 'bg-[#C75A5A]/20 text-[#C75A5A] border border-[#C75A5A]/50'
                    : log.level === 'WARN'
                    ? 'bg-[#C49A4A]/20 text-[#C49A4A] border border-[#C49A4A]/50'
                    : 'bg-[#4F9A72]/20 text-[#4F9A72] border border-[#4F9A72]/50'
                }`}
              >
                {log.level}
              </span>
              <span className="text-[#E7EBEF] truncate">{log.msg}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
