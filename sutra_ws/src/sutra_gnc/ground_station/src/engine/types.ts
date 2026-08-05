import type { Waypoint, DroneAsset, TelemetryData } from '../types';

/* ============================================================
   Mission State Machine States
   ============================================================ */

export type MissionState =
  | 'IDLE'
  | 'PLANNING'
  | 'READY'
  | 'UPLOADING'
  | 'ARMING'
  | 'TAKEOFF'
  | 'MISSION'
  | 'HOLD'
  | 'RTL'
  | 'LANDING'
  | 'COMPLETE'
  | 'ABORTED'
  | 'EMERGENCY';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/* ============================================================
   Battery Estimator Metrics
   ============================================================ */

export interface BatteryEstimation {
  missionBatteryPercent: number;
  rtlReservePercent: number;
  emergencyReservePercent: number;
  hoverReservePercent: number;
  payloadConsumptionWh: number;
  remainingBatteryPercent: number;
  batteryHealthPercent: number;
  totalEnergyRequiredWh: number;
  estimatedFlightTimeMin: number;
  isSafeToFly: boolean;
}

/* ============================================================
   Validation Issues & Reports
   ============================================================ */

export interface ValidationIssue {
  id: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  category: 'ALTITUDE' | 'GEOFENCE' | 'BATTERY' | 'COMMUNICATION' | 'TERRAIN' | 'WAYPOINT';
  message: string;
  waypointId?: number;
}

export interface MissionValidationResult {
  isValid: boolean;
  waypointCountValid: boolean;
  maxAltitudeValid: boolean;
  minAltitudeValid: boolean;
  geofenceViolationCount: number;
  missionLengthKm: number;
  commCoveragePercent: number;
  batterySufficiency: boolean;
  rtlPossibility: boolean;
  issues: ValidationIssue[];
  validatedAt: string;
}

/* ============================================================
   Route Optimization Results
   ============================================================ */

export interface RouteOptimizationResult {
  optimizedWaypoints: Waypoint[];
  originalDistanceKm: number;
  optimizedDistanceKm: number;
  distanceSavedKm: number;
  totalTurnAngleDegrees: number;
  estimatedDurationMin: number;
  estimatedBatterySavingsPercent: number;
}

/* ============================================================
   Mission Templates
   ============================================================ */

export type TemplatePatternType =
  | 'GRID_SEARCH'
  | 'PERIMETER_PATROL'
  | 'ORBIT'
  | 'RAPID_RECON'
  | 'ZIG_ZAG'
  | 'LAWN_MOWER'
  | 'CORRIDOR_INSPECTION';

export interface MissionTemplate {
  id: string;
  name: string;
  description: string;
  patternType: TemplatePatternType;
  defaultAltitudeM: number;
  defaultSpeedKmh: number;
  spacingMeters?: number;
  orbitRadiusMeters?: number;
  waypoints: Waypoint[];
}

/* ============================================================
   Risk Engine Analysis
   ============================================================ */

export interface RiskAnalysis {
  overallRisk: RiskLevel;
  riskScore: number; // 0 to 100
  factors: {
    batteryRisk: RiskLevel;
    terrainRisk: RiskLevel;
    weatherRisk: RiskLevel;
    communicationRisk: RiskLevel;
    geofenceRisk: RiskLevel;
    complexityRisk: RiskLevel;
  };
  recommendations: string[];
}

/* ============================================================
   Environmental & Telemetry Analyzers
   ============================================================ */

export interface TerrainAnalysis {
  minElevationM: number;
  maxElevationM: number;
  avgSlopeDegrees: number;
  clearanceMarginM: number;
  hasTerrainCollisions: boolean;
}

export interface WeatherAnalysis {
  windSpeedMps: number;
  windDirectionDegrees: number;
  gustMps: number;
  rainProbabilityPercent: number;
  visibilityKm: number;
  isWeatherSafe: boolean;
}

export interface CommunicationAnalysis {
  averageSignalRssiDbm: number;
  minCoveragePercent: number;
  losBreachCount: number;
  estimatedLatencyMs: number;
  isCoverageAdequate: boolean;
}

/* ============================================================
   Emergency & Failsafe Types
   ============================================================ */

export type EmergencyTriggerType =
  | 'BATTERY_CRITICAL'
  | 'GPS_LOST'
  | 'RC_LOST'
  | 'TELEMETRY_LOST'
  | 'GEOFENCE_VIOLATION'
  | 'MOTOR_FAILURE'
  | 'WEATHER_EMERGENCY';

export type EmergencyAction = 'WARNING' | 'HOVER' | 'RTL' | 'EMERGENCY_LAND';

export interface EmergencyEvent {
  id: string;
  trigger: EmergencyTriggerType;
  action: EmergencyAction;
  timestamp: string;
  message: string;
  resolved: boolean;
}

/* ============================================================
   Reports & Timeline
   ============================================================ */

export interface PreflightReport {
  id: string;
  missionName: string;
  createdAt: string;
  state: MissionState;
  batteryAnalysis: BatteryEstimation;
  validation: MissionValidationResult;
  optimization: RouteOptimizationResult;
  risk: RiskAnalysis;
  terrain: TerrainAnalysis;
  weather: WeatherAnalysis;
  communication: CommunicationAnalysis;
  isApprovedForTakeoff: boolean;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  state: MissionState;
  category: 'STATE_CHANGE' | 'COMMAND' | 'WARNING' | 'ERROR' | 'CHECKPOINT';
  message: string;
  details?: Record<string, any>;
}

export interface PostflightReport {
  id: string;
  missionId: string;
  startTime: string;
  endTime: string;
  totalFlightDurationMin: number;
  distanceFlownKm: number;
  maxAltitudeAchievedM: number;
  maxSpeedAchievedKmh: number;
  startBatteryPercent: number;
  endBatteryPercent: number;
  batteryConsumedPercent: number;
  eventsCount: number;
  emergencyCount: number;
  completionStatus: 'SUCCESS' | 'PARTIAL' | 'ABORTED' | 'EMERGENCY_LANDED';
}
