import type { TelemetryData } from '../../types';
import { emergencyManager } from './emergencyManager';

export class FailsafeManager {
  private minBatteryPercent: number = 20;
  private minSignalPercent: number = 15;
  private maxWindMps: number = 14;

  /**
   * Evaluate real-time telemetry feed against safety thresholds.
   */
  public evaluateTelemetry(telemetry: Partial<TelemetryData>): void {
    if (!telemetry) return;

    // 1. Critical Battery Failsafe
    if (telemetry.batteryRemaining !== undefined && telemetry.batteryRemaining <= this.minBatteryPercent) {
      emergencyManager.triggerEmergency(
        'BATTERY_CRITICAL',
        `Battery level (${telemetry.batteryRemaining}%) dropped below critical threshold (${this.minBatteryPercent}%).`
      );
    }
  }

  public setThresholds(minBat: number, minSignal: number, maxWind: number) {
    this.minBatteryPercent = minBat;
    this.minSignalPercent = minSignal;
    this.maxWindMps = maxWind;
  }
}

export const failsafeManager = new FailsafeManager();
