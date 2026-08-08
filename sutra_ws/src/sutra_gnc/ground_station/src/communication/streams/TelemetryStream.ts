import { WebSocketManager } from '../core/WebSocketManager';
import type { TelemetryData } from '../../types';
import { CommunicationEvents } from '../events/CommunicationEvents';

type TelemetryCallback = (data: TelemetryData) => void;

export class TelemetryStream {
  private static instance: TelemetryStream;
  private wsManager = WebSocketManager.getChannel('TELEMETRY');
  private listeners: Set<TelemetryCallback> = new Set();

  private constructor() {
    this.wsManager.subscribe('telemetry', (payload) => {
      CommunicationEvents.emitTelemetryFrame(payload);
      this.listeners.forEach((cb) => cb(payload));
    });
  }

  public static getInstance(): TelemetryStream {
    if (!TelemetryStream.instance) {
      TelemetryStream.instance = new TelemetryStream();
    }
    return TelemetryStream.instance;
  }

  public subscribe(cb: TelemetryCallback): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
}

export const telemetryStream = TelemetryStream.getInstance();
