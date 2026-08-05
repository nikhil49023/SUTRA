import type { TelemetryData, DroneAsset } from '../../types';

export class TelemetryManager {
  /**
   * Normalizes incoming MAVLink packets into TelemetryData schema.
   */
  public static normalizeTelemetry(rawPayload: Record<string, any>): TelemetryData {
    return {
      pitch: rawPayload.pitch || 0,
      roll: rawPayload.roll || 0,
      yaw: rawPayload.yaw || 0,
      altitudeAGL: rawPayload.altAGL || rawPayload.altitude || 50,
      altitudeMSL: (rawPayload.altAGL || 50) + 350,
      groundSpeed: rawPayload.groundSpeed || 0,
      airSpeed: rawPayload.airSpeed || 0,
      climbRate: rawPayload.climbRate || 0,
      batteryVoltage: rawPayload.voltage || 16.8,
      batteryCurrent: rawPayload.current || 12.4,
      batteryRemaining: rawPayload.batteryPercent || 98,
      cellVoltages: [4.2, 4.2, 4.2, 4.2],
      motorRPM: [5400, 5420, 5390, 5410],
      temperatureAvionics: 38.5,
      temperatureESC: 42.0,
      satellites: rawPayload.satellites || 18,
      linkLatencyMs: 25
    };
  }
}
