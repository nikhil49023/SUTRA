import type { UnifiedOperationalPicture } from '../types';
import type { DroneAsset, TelemetryData, AIDetection } from '../../types';
import { ThreatAssessmentEngine } from '../decision/ThreatAssessment';
import { TargetTracker } from '../vision/TargetTracker';
import { GISIntelligenceService } from '../../gis/gisIntelligenceService';
import { ConfidenceEngine } from './ConfidenceEngine';

export class SensorFusionEngine {
  /**
   * Fuse multi-modal sensor inputs into a single Unified Operational Picture (COP).
   */
  public static fuse(
    drone: DroneAsset,
    telemetry: TelemetryData,
    detections: AIDetection[] = []
  ): UnifiedOperationalPicture {
    const trackedTargets = TargetTracker.processDetections(detections);
    const threats = ThreatAssessmentEngine.evaluateThreats([], detections, drone.battery, drone.signalStrength);
    const confidence = ConfidenceEngine.calculateConfidence(telemetry, drone.signalStrength);

    return {
      fusedTimestamp: new Date().toISOString(),
      overallConfidenceScore: confidence,
      droneState: {
        lat: drone.lat,
        lng: drone.lng,
        altAGL: drone.altitude || 0,
        speedKmh: drone.groundSpeed || 0,
        heading: drone.heading || 0,
        batteryPercent: drone.battery || 100
      },
      threatCount: threats.threats.length,
      activeTargetsCount: trackedTargets.length,
      environmentalRisk: threats.overallThreatLevel,
      linkHealthPercent: drone.signalStrength || 95
    };
  }
}
