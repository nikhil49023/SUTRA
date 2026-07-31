export interface DetailedHealthMetrics {
  cpuUsagePercent: number;
  ramUsageMb: number;
  jsHeapPercent: number;
  fps: number;
  networkLatencyMs: number;
  apiLatencyMs: number;
  webSocketLatencyMs: number;
  packetLossPercent: number;
  droneHeartbeatActive: boolean;
  signalQualityPercent: number;
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
}

export interface SubsystemDiagnostic {
  name: string;
  category: 'COMMUNICATION' | 'RENDERER' | 'AI_ENGINE' | 'DATABASE' | 'NETWORK';
  status: 'PASS' | 'WARN' | 'FAIL';
  latencyMs: number;
  message: string;
  autoRecovered: boolean;
}

export interface SyncQueueItem {
  id: string;
  type: 'TELEMETRY' | 'MISSION_WAYPOINT' | 'MAV_COMMAND' | 'AI_LOG';
  payload: any;
  queuedAt: string;
  retryCount: number;
}
