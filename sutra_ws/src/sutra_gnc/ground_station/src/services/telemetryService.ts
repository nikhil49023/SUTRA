import type { TelemetryData } from '../types';
import { WebSocketManager } from './websocketManager';

export type FlightMode = 'GUIDED' | 'AUTO_MISSION' | 'STABILIZE' | 'RTL' | 'MANUAL' | 'LOITER';

export interface TelemetryPacket extends TelemetryData {
  timestamp: string;
  timeFormatted: string;
  flightMode: FlightMode;
  powerWatts?: number;
}

export class TelemetryService {
  private wsManager: WebSocketManager;

  constructor(wsManager: WebSocketManager) {
    this.wsManager = wsManager;
  }

  public subscribeTelemetry(onTelemetry: (data: TelemetryPacket) => void) {
    this.wsManager.subscribe('telemetry', (payload) => {
      const normalized = this.parseTelemetryPayload(payload);
      onTelemetry(normalized);
    });
  }

  public setFlightMode(mode: FlightMode) {
    this.wsManager.send('command', {
      cmd: 'SET_MODE',
      mode
    });
  }

  public triggerRTH() {
    this.wsManager.send('command', {
      cmd: 'MAV_CMD_NAV_RETURN_TO_LAUNCH'
    });
  }

  private parseTelemetryPayload(payload: any): TelemetryPacket {
    const voltage = payload.batteryVoltage || 24.4;
    const current = payload.batteryCurrent || 18.5;
    const powerWatts = +(voltage * current).toFixed(1);

    return {
      pitch: payload.pitch ?? 0,
      roll: payload.roll ?? 0,
      yaw: payload.yaw ?? 0,
      altitudeAGL: payload.altitudeAGL ?? 0,
      altitudeMSL: payload.altitudeMSL ?? 0,
      groundSpeed: payload.groundSpeed ?? 0,
      airSpeed: payload.airSpeed ?? 0,
      climbRate: payload.climbRate ?? 0,
      batteryVoltage: voltage,
      batteryCurrent: current,
      batteryRemaining: payload.batteryRemaining ?? 100,
      cellVoltages: payload.cellVoltages || [4.07, 4.06, 4.07, 4.06, 4.07, 4.07],
      motorRPM: payload.motorRPM || [4250, 4240, 4260, 4245],
      temperatureAvionics: payload.temperatureAvionics || 38.4,
      temperatureESC: payload.temperatureESC || 44.2,
      satellites: payload.satellites || 21,
      linkLatencyMs: payload.linkLatencyMs || 14,
      timestamp: payload.timestamp || new Date().toISOString(),
      timeFormatted: payload.timeFormatted || new Date().toTimeString().split(' ')[0],
      flightMode: payload.flightMode || 'AUTO_MISSION',
      powerWatts
    };
  }
}
