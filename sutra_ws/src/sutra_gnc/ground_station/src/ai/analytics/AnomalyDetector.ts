import type { FlightAnomaly } from '../types';
import type { TelemetryData, DroneAsset } from '../../types';

export class AnomalyDetectorEngine {
  public static detectAnomalies(
    drone: DroneAsset,
    telemetry: TelemetryData,
    prevAlt: number = 50
  ): FlightAnomaly[] {
    const anomalies: FlightAnomaly[] = [];
    const now = new Date().toISOString();

    // 1. Unexpected Altitude Change Check (>15m rapid drop or climb)
    const currentAlt = drone.altitude || 0;
    if (Math.abs(currentAlt - prevAlt) > 15) {
      anomalies.push({
        id: `anom-alt-${Date.now()}`,
        type: 'ALTITUDE_DEVIATION',
        severity: 'HIGH',
        message: `Rapid altitude change detected (${prevAlt}m -> ${currentAlt}m).`,
        detectedAt: now
      });
    }

    // 2. Radio Link Signal Drop
    if (drone.signalStrength < 40) {
      anomalies.push({
        id: `anom-sig-${Date.now()}`,
        type: 'SIGNAL_DROP',
        severity: 'CRITICAL',
        message: `Signal strength dropped to ${drone.signalStrength}%. Link loss imminent.`,
        detectedAt: now
      });
    }

    // 3. Battery Drain Spike
    if (drone.battery < 25) {
      anomalies.push({
        id: `anom-bat-${Date.now()}`,
        type: 'BATTERY_DRAIN_SPIKE',
        severity: 'HIGH',
        message: `Low battery level detected (${drone.battery}% remaining).`,
        detectedAt: now
      });
    }

    // 4. Abnormal Pitch/Roll
    if (Math.abs(telemetry.pitch || 0) > 30 || Math.abs(telemetry.roll || 0) > 30) {
      anomalies.push({
        id: `anom-attitude-${Date.now()}`,
        type: 'ABNORMAL_PITCH_ROLL',
        severity: 'MEDIUM',
        message: `Abnormal attitude pitch/roll (${(telemetry.pitch || 0).toFixed(1)}° / ${(telemetry.roll || 0).toFixed(1)}°).`,
        detectedAt: now
      });
    }

    return anomalies;
  }
}
