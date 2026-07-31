import type { Waypoint } from '../types';

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface ValidationIssue {
  id: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  category: 'ALTITUDE' | 'GEOFENCE' | 'BATTERY' | 'COMMUNICATION' | 'TERRAIN';
  message: string;
  waypointId?: number;
}

export interface BatteryAnalysisReport {
  totalEnergyRequiredWh: number;
  batteryConsumedPercent: number;
  remainingBatteryPercentAtRTH: number;
  isRthReserveSafe: boolean; // Must be >= 25%
  estimatedFlightTimeMin: number;
}

export interface PreFlightChecklistItem {
  id: string;
  title: string;
  passed: boolean;
  category: 'HARDWARE' | 'SAFETY' | 'COMMUNICATION' | 'PAYLOAD';
}

export interface ValidationReport {
  isValid: boolean;
  riskLevel: RiskLevel;
  complexityScore: number; // 0 to 100
  maxRangeKm: number;
  issues: ValidationIssue[];
  batteryReport: BatteryAnalysisReport;
  checklist: PreFlightChecklistItem[];
  timestamp: string;
}

export interface MissionTemplate {
  id: string;
  name: string;
  description: string;
  patternType: 'GRID' | 'PERIMETER' | 'LOITER' | 'RAPID_RECON';
  defaultAltitudeM: number;
  defaultSpeedKmh: number;
  waypoints: Partial<Waypoint>[];
}
