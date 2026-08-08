import type { TelemetryData } from '../../types';

export class ConfidenceEngine {
  public static calculateConfidence(telemetry: TelemetryData, signalPercent: number = 95): number {
    const satsScore = Math.min(100, ((telemetry.satellites || 16) / 18) * 100);
    const linkScore = Math.min(100, Math.max(0, signalPercent));
    const latencyScore = telemetry.linkLatencyMs ? Math.max(0, 100 - telemetry.linkLatencyMs * 0.5) : 95;

    const composite = satsScore * 0.4 + linkScore * 0.4 + latencyScore * 0.2;
    return Math.round(Math.max(10, Math.min(99, composite)));
  }
}
