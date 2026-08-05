import type { DroneAsset, Waypoint } from '../types';

/* ============================================================
   Swarm State & Formation Types
   ============================================================ */

export type SwarmState =
  | 'STANDBY'
  | 'ASSEMBLING'
  | 'IN_FORMATION'
  | 'EXECUTING_MISSION'
  | 'DECONFLICTING'
  | 'RECOVERY'
  | 'DISPERSED';

export type FormationPattern =
  | 'LINE'
  | 'COLUMN'
  | 'V_FORMATION'
  | 'DIAMOND'
  | 'CIRCLE'
  | 'GRID'
  | 'CUSTOM';

export interface FormationOffset {
  droneId: string;
  dxMeters: number;
  dyMeters: number;
  dzMeters: number;
  isLeader: boolean;
}

/* ============================================================
   Drone Node Registry Types
   ============================================================ */

export interface SwarmNode {
  droneId: string;
  callsign: string;
  isLeader: boolean;
  isBackupLeader: boolean;
  status: 'IDLE' | 'ASSIGNED' | 'IN_FLIGHT' | 'RTL' | 'FAULT';
  batteryPercent: number;
  signalQualityPercent: number;
  lat: number;
  lng: number;
  altitudeAGLM: number;
  headingDegrees: number;
  speedKmh: number;
  assignedMissionId?: string;
  payloadType: string;
  lastMeshHeartbeatTime: string;
}

/* ============================================================
   Task Allocation Schemas
   ============================================================ */

export interface TaskAllocationResult {
  taskId: string;
  assignedDroneId: string;
  suitabilityScore: number; // 0 to 100
  reason: string;
}

/* ============================================================
   Collision & Deconfliction Schemas
   ============================================================ */

export interface CollisionRisk {
  id: string;
  drone1Id: string;
  drone2Id: string;
  distanceMeters: number;
  timeToImpactSec: number;
  severity: 'WARNING' | 'CRITICAL';
  suggestedAction: string;
}

/* ============================================================
   Swarm Analytics Schemas
   ============================================================ */

export interface SwarmAnalyticsSummary {
  activeDroneCount: number;
  fleetUtilizationPercent: number;
  areaCoverageKm2: number;
  avgBatteryPercent: number;
  formationIntegrityPercent: number;
  meshHealthPercent: number;
  activeConflictsCount: number;
}
