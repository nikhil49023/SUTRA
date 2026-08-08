import { eventBus } from '../../services/eventBus';
import type { ConnectionState } from '../core/ConnectionState';
import type { TelemetryData } from '../../types';

export class CommunicationEvents {
  public static emitStateChange(channel: string, state: ConnectionState): void {
    eventBus.emit('COMMUNICATION_STATE_CHANGED' as any, { channel, state });
  }

  public static emitTelemetryFrame(telemetry: TelemetryData): void {
    eventBus.emit('TELEMETRY_UPDATED' as any, telemetry);
  }

  public static emitAlert(severity: 'INFO' | 'WARNING' | 'CRITICAL', message: string): void {
    eventBus.emit('COMMUNICATION_ALERT' as any, { severity, message, timestamp: Date.now() });
  }
}
