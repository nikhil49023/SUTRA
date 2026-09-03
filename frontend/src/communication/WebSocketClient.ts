/**
 * Smart Horizon GCS — Resilient Tactical WebSocket Client
 * Subsystem: Communication & Gateway Client (Phase 13 Hardened)
 */

import { messageRouter } from './MessageRouter';
import { useCommunicationStore } from '../stores/communicationStore';
import { useAuthStore } from '../security/authStore';

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'env_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
};

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_WS_URL) ||
    'ws://127.0.0.1:8765';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 50;
  private reconnectIntervalMs = 2000;
  private isExplicitlyClosed = false;
  private pingInterval: any = null;

  public connect(url?: string): void {
    if (url) this.url = url;
    this.isExplicitlyClosed = false;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    useCommunicationStore.getState().setConnectionState('RECONNECTING');

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        useCommunicationStore.getState().setConnectionState('CONNECTED');
        useCommunicationStore.getState().setError(null);
        this.startHeartbeat();

        // Resume saved authentication session if available
        const token = useAuthStore.getState().token;
        if (token) {
          this.sendEnvelope('auth.resume_session', { token });
        }

        // Request initial full state snapshot
        this.requestStateSnapshot();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          useCommunicationStore.getState().recordMessageReceived(event.data.length);
          const data = JSON.parse(event.data);
          messageRouter.routeMessage(data);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        useCommunicationStore.getState().setConnectionState('OFFLINE');
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        useCommunicationStore.getState().setError('WebSocket connection encountered an error');
      };
    } catch (err: any) {
      useCommunicationStore.getState().setError(err?.message || 'WebSocket initialization failed');
      this.scheduleReconnect();
    }
  }

  public sendRaw(data: string): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      useCommunicationStore.getState().recordMessageSent(data.length);
      this.ws.send(data);
      return true;
    }
    console.warn('Cannot send command — WebSocket is not connected.');
    return false;
  }

  public sendEnvelope(commandType: string, payload: any = {}): boolean {
    const auth = useAuthStore.getState();
    const envelope = {
      command_id: generateUUID(),
      command_type: commandType,
      timestamp: Date.now() / 1000,
      correlation_id: generateUUID(),
      session_id: auth.sessionId,
      token: auth.token,
      payload,
    };
    return this.sendRaw(JSON.stringify(envelope));
  }

  public sendCommand(commandType: string, payload: any = {}): boolean {
    return this.sendEnvelope(commandType, payload);
  }

  public send(data: any): boolean {
    if (typeof data === 'string') return this.sendRaw(data);
    if (data?.command || data?.command_type) {
      return this.sendCommand(data.command || data.command_type, data.payload || {});
    }
    return this.sendRaw(JSON.stringify(data));
  }

  public requestStateSnapshot(): void {
    this.sendRaw(JSON.stringify({ type: 'REQUEST_STATE_SNAPSHOT', timestamp: Date.now() }));
  }

  public requestTelemetrySnapshot(): void {
    this.sendRaw(JSON.stringify({ type: 'REQUEST_TELEMETRY_SNAPSHOT', timestamp: Date.now() }));
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    useCommunicationStore.getState().setConnectionState('OFFLINE');
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      useCommunicationStore.getState().setError('Maximum reconnection attempts exceeded.');
      return;
    }
    this.reconnectAttempts++;
    useCommunicationStore.getState().recordReconnectAttempt();
    setTimeout(() => {
      this.connect();
    }, this.reconnectIntervalMs);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const t0 = Date.now();
        this.sendRaw(JSON.stringify({ type: 'PING', timestamp: t0 / 1000 }));
      }
    }, 5000);
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

export const wsClient = new WebSocketClient();
