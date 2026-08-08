import type { Waypoint, DroneAsset, TelemetryData, AIDetection } from '../types';
import type { RiskLevel } from '../engine/types';

/* ============================================================
   Legacy Inference Schemas
   ============================================================ */

export interface BoundingBox { x: number; y: number; w?: number; h?: number; width?: number; height?: number; }
export interface InferenceResult { label: string; confidence: number; bbox: BoundingBox; }
export interface IInferenceModel { predict(image: any): Promise<InferenceResult[]>; }

/* ============================================================
   AI Threat Assessment Types
   ============================================================ */

export type ThreatSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ThreatItem {
  id: string;
  category: 'TARGET' | 'RESTRICTED_ZONE' | 'WEATHER' | 'SIGNAL_DEGRADATION' | 'COMPLEXITY' | 'ANOMALY';
  title: string;
  severity: ThreatSeverity;
  score: number; // 0 to 100
  description: string;
  coordinates?: { lat: number; lng: number };
  timestamp: string;
}

export interface ThreatAssessmentResult {
  overallThreatLevel: ThreatSeverity;
  threatScore: number; // 0 to 100
  threats: ThreatItem[];
  mitigationActions: string[];
  assessedAt: string;
}

/* ============================================================
   AI Recommendation & Decision Types
   ============================================================ */

export type RecommendationType =
  | 'OPTIMIZE_WAYPOINTS'
  | 'REDUCE_DURATION'
  | 'BATTERY_CONSERVATION'
  | 'AVOID_RISK_AREA'
  | 'EMERGENCY_LANDING_SITE'
  | 'ALTERNATE_ROUTE';

export interface AIRecommendation {
  id: string;
  type: RecommendationType;
  title: string;
  summary: string;
  impactScore: number; // 0 to 100
  suggestedAction: string;
  confidencePercent: number;
}

/* ============================================================
   Target Vision & Tracking Types
   ============================================================ */

export type TargetClass = 'VEHICLE' | 'PERSON' | 'AIRCRAFT' | 'VESSEL' | 'HAZARD' | 'STRUCTURE';

export interface TrackedTarget {
  id: string; // Persistent ID e.g. TGT-101
  label: string;
  category: TargetClass;
  confidencePercent: number;
  priorityScore: number; // 0 to 100
  lat: number;
  lng: number;
  altitudeM: number;
  speedKmh: number;
  headingDegrees: number;
  firstSeenAt: string;
  lastSeenAt: string;
  status: 'ACTIVE' | 'LOST' | 'TRACKED';
}

/* ============================================================
   Prediction Engine Types
   ============================================================ */

export interface AIPredictions {
  predictedRemainingBatteryPercent: number;
  estimatedMissionDurationMin: number;
  etaTimestamp: string;
  commsLossProbabilityPercent: number;
  missionSuccessProbabilityPercent: number;
  potentialFailures: string[];
}

/* ============================================================
   NLP & Command Assistant Types
   ============================================================ */

export type StructuredActionType =
  | 'CREATE_GRID_MISSION'
  | 'RETURN_ALL_DRONES'
  | 'HIGHLIGHT_NO_FLY_ZONES'
  | 'ESTIMATE_BATTERY'
  | 'PAUSE_MISSION'
  | 'RESUME_MISSION'
  | 'LAND_DRONE'
  | 'UNKNOWN';

export interface ParsedCommand {
  rawUtterance: string;
  actionType: StructuredActionType;
  intentConfidence: number; // 0 to 100
  parameters: Record<string, any>;
  explanation: string;
}

/* ============================================================
   Sensor Fusion & Anomaly Types
   ============================================================ */

export interface UnifiedOperationalPicture {
  fusedTimestamp: string;
  overallConfidenceScore: number; // 0 to 100
  droneState: {
    lat: number;
    lng: number;
    altAGL: number;
    speedKmh: number;
    heading: number;
    batteryPercent: number;
  };
  threatCount: number;
  activeTargetsCount: number;
  environmentalRisk: RiskLevel;
  linkHealthPercent: number;
}

export interface FlightAnomaly {
  id: string;
  type: 'ALTITUDE_DEVIATION' | 'SIGNAL_DROP' | 'BATTERY_DRAIN_SPIKE' | 'PATH_DEVIATION' | 'ABNORMAL_PITCH_ROLL';
  severity: ThreatSeverity;
  message: string;
  detectedAt: string;
}

/* ============================================================
   AI Mission Analytics Schemas
   ============================================================ */

export interface AIMissionAnalyticsSummary {
  missionEfficiencyScore: number; // 0 to 100
  areaCoveragePercent: number;
  totalDetectionsCount: number;
  avgSpeedKmh: number;
  batteryUtilizationWhPerKm: number;
  operatorWorkloadIndex: 'LOW' | 'OPTIMAL' | 'HIGH' | 'CRITICAL';
}
