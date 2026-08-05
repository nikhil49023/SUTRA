import type { TelemetryData } from '../../types';

export class PX4Telemetry {
  public static parsePX4Status(payload: any): Partial<TelemetryData> {
    return {
      altitudeAGL: payload.alt || 50,
      batteryRemaining: payload.battery || 95
    };
  }
}
