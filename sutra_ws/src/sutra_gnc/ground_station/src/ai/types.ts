export type DetectionClass = 'FIRE' | 'VEHICLE' | 'HUMAN' | 'STRUCTURE' | 'UNKNOWN';
export type ThreatLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface BoundingBox {
  x: number; // Top-left X %
  y: number; // Top-left Y %
  width: number; // Width %
  height: number; // Height %
}

export interface InferenceResult {
  id: string;
  trackId: number; // Persistent tracking ID (ByteTrack / DeepSORT)
  class: DetectionClass;
  label: string; // e.g. "Active Flame Spot", "Armored Vehicle"
  confidence: number; // 0 to 100
  threatLevel: ThreatLevel;
  bbox: BoundingBox;
  gpsCoordinates: { lat: number; lng: number; alt: number };
  velocityVector: { vx: number; vy: number; speedKmh: number };
  timestamp: string;
  sensorType: 'EO_OPTICAL' | 'IR_THERMAL';
}

export interface RouteRecommendation {
  id: string;
  type: 'EVADE_HAZARD' | 'OPTIMIZE_COVERAGE' | 'ALTITUDE_ADJUST';
  title: string;
  reason: string;
  suggestedWaypoints: { lat: number; lng: number; alt: number }[];
  distanceImpactKm: number;
}

export interface BatteryPredictionResult {
  remainingPercent: number;
  estimatedMinutesLeft: number;
  consumptionRatePercentPerMin: number;
  predictedDepletionTime: string;
  warningTriggered: boolean;
}

export interface IInferenceModel {
  modelName: string;
  modelVersion: string;
  loadModel(): Promise<boolean>;
  predict(frameData: any): Promise<InferenceResult[]>;
}
