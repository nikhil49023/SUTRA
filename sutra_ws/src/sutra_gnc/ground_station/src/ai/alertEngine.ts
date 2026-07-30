import type { InferenceResult } from './types';

export interface AIAlert {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  targetId: string;
  coordinates: string;
  timestamp: string;
}

export class AlertEngine {
  public evaluateDetections(detections: InferenceResult[]): AIAlert[] {
    const alerts: AIAlert[] = [];
    const now = new Date().toTimeString().split(' ')[0];

    detections.forEach((det) => {
      if (det.class === 'FIRE') {
        alerts.push({
          id: `ALT-FIRE-${det.trackId}`,
          severity: 'CRITICAL',
          title: 'ACTIVE FIRE HAZARD DETECTED',
          message: `Thermal camera detected active flame front at ${det.confidence}% confidence.`,
          targetId: det.id,
          coordinates: `${det.gpsCoordinates.lat} N, ${det.gpsCoordinates.lng} E`,
          timestamp: now
        });
      } else if (det.class === 'VEHICLE' && det.threatLevel === 'HIGH') {
        alerts.push({
          id: `ALT-[#VEH-${det.trackId}]`,
          severity: 'WARNING',
          title: 'CONVOY VEHICLE DETECTED',
          message: `Armored convoy tracked at ${det.velocityVector.speedKmh} km/h.`,
          targetId: det.id,
          coordinates: `${det.gpsCoordinates.lat} N, ${det.gpsCoordinates.lng} E`,
          timestamp: now
        });
      } else if (det.class === 'HUMAN' && det.confidence > 90) {
        alerts.push({
          id: `ALT-HUMAN-${det.trackId}`,
          severity: 'INFO',
          title: 'PERSONNEL DETECTED',
          message: `Thermal heat signature identified in sector 4-B.`,
          targetId: det.id,
          coordinates: `${det.gpsCoordinates.lat} N, ${det.gpsCoordinates.lng} E`,
          timestamp: now
        });
      }
    });

    return alerts;
  }
}
