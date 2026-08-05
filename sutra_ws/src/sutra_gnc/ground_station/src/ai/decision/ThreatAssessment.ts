import type { ThreatAssessmentResult, ThreatItem, ThreatSeverity } from '../types';
import type { Waypoint, AIDetection } from '../../types';
import { geofenceStore } from '../../geofence/store/GeofenceStore';

export class ThreatAssessmentEngine {
  public static evaluateThreats(
    waypoints: Waypoint[],
    detections: AIDetection[] = [],
    batteryPercent: number = 95,
    signalStrength: number = 95
  ): ThreatAssessmentResult {
    const threats: ThreatItem[] = [];

    // 1. Detected Targets Threat
    if (detections.length > 0) {
      detections.forEach((det, idx) => {
        const isHighRisk = det.type.toLowerCase().includes('weapon') || det.type.toLowerCase().includes('vehicle');
        threats.push({
          id: `threat-det-${idx}`,
          category: 'TARGET',
          title: `Detected ${det.type}`,
          severity: isHighRisk ? 'HIGH' : 'MEDIUM',
          score: Math.round(det.confidence * 100),
          description: `Visual detection "${det.type}" with ${(det.confidence * 100).toFixed(0)}% confidence at ${det.coordinates}.`,
          timestamp: new Date().toISOString()
        });
      });
    }

    // 2. Restricted Areas (No-Fly Geofences)
    const geofences = geofenceStore.getState().collection.features;
    const noFlyFences = geofences.filter((f) => f.properties?.type === 'NO_FLY');
    if (noFlyFences.length > 0) {
      threats.push({
        id: 'threat-geofence',
        category: 'RESTRICTED_ZONE',
        title: 'Active No-Fly Zone Perimeter',
        severity: 'HIGH',
        score: 75,
        description: `Flight path operates near ${noFlyFences.length} active No-Fly restricted airspace boundaries.`,
        timestamp: new Date().toISOString()
      });
    }

    // 3. Signal Degradation
    if (signalStrength < 50) {
      threats.push({
        id: 'threat-signal',
        category: 'SIGNAL_DEGRADATION',
        title: 'Radio Telemetry Signal Loss',
        severity: signalStrength < 25 ? 'CRITICAL' : 'HIGH',
        score: 100 - signalStrength,
        description: `Signal strength dropped to ${signalStrength}%. High probability of communication loss.`,
        timestamp: new Date().toISOString()
      });
    }

    // 4. Mission Complexity
    if (waypoints.length > 15) {
      threats.push({
        id: 'threat-[#0b1428]',
        category: 'COMPLEXITY',
        title: 'High Waypoint Route Complexity',
        severity: 'MEDIUM',
        score: 45,
        description: `Mission contains ${waypoints.length} waypoints, increasing operator workload and turn frequency.`,
        timestamp: new Date().toISOString()
      });
    }

    // Compute composite threat score & level
    let maxScore = 10;
    threats.forEach((t) => {
      if (t.score > maxScore) maxScore = t.score;
    });

    let overallLevel: ThreatSeverity = 'LOW';
    if (maxScore >= 80) overallLevel = 'CRITICAL';
    else if (maxScore >= 60) overallLevel = 'HIGH';
    else if (maxScore >= 35) overallLevel = 'MEDIUM';

    const mitigationActions: string[] = [];
    if (overallLevel === 'CRITICAL' || overallLevel === 'HIGH') {
      mitigationActions.push('Ascend UAV altitude by 30m to maintain clear Line-of-Sight.');
      mitigationActions.push('Engage automated Return-To-Launch if signal drops below 20%.');
    } else {
      mitigationActions.push('Nominal threat levels. Maintain visual telemetry monitoring.');
    }

    return {
      overallThreatLevel: overallLevel,
      threatScore: maxScore,
      threats,
      mitigationActions,
      assessedAt: new Date().toISOString()
    };
  }
}
