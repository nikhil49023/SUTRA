import { Logger } from './Logger';

export class TelemetryLogger {
  public static logTelemetryPacket(droneId: string, lat: number, lng: number, alt: number): void {
    Logger.info('TELEMETRY', `[${droneId}] GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)} Alt: ${alt}m`);
  }
}
