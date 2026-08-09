export type SwarmFormation = 'LINE_VEE' | 'GRID_ARRAY' | 'ORBIT_RING' | 'DELTA_CHEVRON';

export interface SwarmDroneMember {
  sysId: number;
  callsign: string;
  isLeader: boolean;
  batteryPercent: number;
  signalQualityPercent: number;
  position: { lat: number; lng: number; alt: number };
  targetOffset: { dx: number; dy: number; dz: number }; // Relative to leader in meters
  status: 'IN_FORMATION' | 'JOINING' | 'LEAVING' | 'COLLISION_WARNING';
}

export interface CollisionWarning {
  id: string;
  drone1SysId: number;
  drone2SysId: number;
  separationDistanceM: number;
  timeToCollisionSec: number;
  severity: 'WARNING' | 'CRITICAL';
}

export interface SwarmStatus {
  swarmId: string;
  leaderSysId: number;
  activeMembersCount: number;
  formation: SwarmFormation;
  coverageScannedPercent: number;
  healthScore: number; // 0 to 100
}
