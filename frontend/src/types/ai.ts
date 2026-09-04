export type AIMode = 'DISABLED' | 'ADVISORY' | 'SIMULATION' | 'ASSISTED';

export type RecommendationSeverity = 'EMERGENCY' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface BatteryPrediction {
  drone_id: string;
  current_battery_pct: number;
  predicted_landing_pct: number;
  predicted_rth_pct: number;
  discharge_rate_pct_per_min: number;
  reserve_margin_pct: number;
  is_anomaly: boolean;
  confidence: number;
  timestamp: number;
}

export interface ETAPrediction {
  drone_id: string;
  eta_to_next_waypoint_sec: number;
  eta_to_mission_end_sec: number;
  eta_to_home_sec: number;
  estimated_distance_remaining_m: number;
  average_speed_mps: number;
  confidence: number;
  timestamp: number;
}

export interface RouteRiskReport {
  mission_name: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  hazard_count: number;
  terrain_clearance_issues: string[];
  geofence_proximity_warnings: string[];
  rf_weak_segments: string[];
  confidence: number;
  timestamp: number;
}

export interface FailurePrediction {
  prediction_id: string;
  drone_id: string;
  subsystem: 'POWER' | 'GPS' | 'COMM' | 'PROPULSION' | 'SENSORS' | string;
  failure_type: string;
  severity: RecommendationSeverity;
  probability: number;
  confidence: number;
  evidence: string;
  timestamp: number;
}

export interface ThreatItem {
  threat_id: string;
  label: string;
  severity: RecommendationSeverity;
  latitude: number;
  longitude: number;
  altitude_m: number;
  distance_m: number;
  source: string;
  confidence: number;
  timestamp: number;
}

export interface RecommendationItem {
  recommendation_id: string;
  title: string;
  message: string;
  reason: string;
  severity: RecommendationSeverity;
  suggested_action?: string | null;
  requires_operator_approval: boolean;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'DISMISSED';
  confidence: number;
  source: string;
  timestamp: number;
}

export interface AssistantMessage {
  msg_id: string;
  sender: 'USER' | 'ASSISTANT' | 'SYSTEM';
  text: string;
  confidence?: number | null;
  timestamp: number;
}

export interface TrackedTarget {
  target_id: string;
  id?: string | number;
  label: string;
  latitude: number;
  longitude: number;
  altitude_m: number;
  speed_mps?: number;
  heading_deg?: number;
  confidence: number;
  source: string;
  drone_id?: string;
  world_id?: string;
  modalities?: string[];
  tracking_status: 'DETECTED' | 'TRACKED' | 'LOST' | string;
  history?: { lat: number; lon: number; alt: number; ts: number }[];
  first_seen?: number;
  last_seen: number;
}

export interface PerceptionStatus {
  connected: boolean;
  status: 'CONNECTED' | 'DEGRADED' | 'OFFLINE';
  last_message_time: number;
  message_count: number;
  rejected_count: number;
  inference_fps: number;
  inference_latency_ms: number;
  active_tracks: number;
  last_error?: string | null;
}

export interface AIState {
  enabled: boolean;
  mode: AIMode;
  analysis_status: 'IDLE' | 'ANALYZING' | 'COMPLETED' | 'DEGRADED' | 'ERROR';
  last_update: number;
  battery_predictions: Record<string, BatteryPrediction>;
  eta_predictions: Record<string, ETAPrediction>;
  route_prediction?: RouteRiskReport | null;
  risk_assessment: string;
  failure_predictions: FailurePrediction[];
  recommendations: RecommendationItem[];
  threats: ThreatItem[];
  tracked_targets: TrackedTarget[];
  perception_status?: PerceptionStatus;
  assistant_messages: AssistantMessage[];
  overall_confidence: number;
  last_error?: string | null;
}

