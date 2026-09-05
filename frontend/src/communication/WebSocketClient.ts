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

const getInitialWsUrl = (): string => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const wsParam = params.get('ws');
    if (wsParam) {
      const formatted = wsParam.startsWith('ws://') || wsParam.startsWith('wss://')
        ? wsParam
        : `ws://${wsParam}:8765`;
      localStorage.setItem('sutra_gcs_ws_url', formatted);
      return formatted;
    }

    const isLocalhost = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';

    const remote = params.get('remote') || params.get('host');
    // If the user explicitly provided remote host and is NOT running on localhost
    if (remote && !isLocalhost) {
      const formatted = remote.startsWith('ws://') || remote.startsWith('wss://') 
        ? remote 
        : `ws://${remote}:8765`;
      localStorage.setItem('sutra_gcs_ws_url', formatted);
      return formatted;
    }

    const saved = localStorage.getItem('sutra_gcs_ws_url');
    // If on localhost and saved points to a non-local address, default to local compute worker
    if (saved && (!isLocalhost || saved.includes('127.0.0.1') || saved.includes('localhost'))) {
      return saved;
    }

    const envUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_WS_URL);
    if (envUrl) return envUrl;

    const hostname = window.location.hostname || '127.0.0.1';
    return `ws://${hostname}:8765`;
  }
  return (
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_WS_URL) ||
    'ws://127.0.0.1:8765'
  );
};

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string = getInitialWsUrl();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 50;
  private reconnectIntervalMs = 2000;
  private isExplicitlyClosed = false;
  private pingInterval: any = null;
  private connectTimeout: any = null;

  public getUrl(): string {
    return this.url;
  }

  public setEndpoint(newEndpoint: string): void {
    let clean = newEndpoint.trim();
    if (!clean) return;
    if (!clean.startsWith('ws://') && !clean.startsWith('wss://')) {
      clean = `ws://${clean}${clean.includes(':') ? '' : ':8765'}`;
    }
    this.url = clean;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sutra_gcs_ws_url', clean);
    }
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect(clean);
  }

  public connect(url?: string): void {
    if (url) this.url = url;
    this.isExplicitlyClosed = false;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    useCommunicationStore.getState().setConnectionState('RECONNECTING');

    if (this.connectTimeout) {
      clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }

    // If connecting to an external remote endpoint, set a 3.5s timeout to auto-fallback to local compute worker
    if (this.url !== 'ws://127.0.0.1:8765' && !this.url.includes('localhost')) {
      this.connectTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
          console.warn(`[WebSocketClient] Remote endpoint ${this.url} timed out. Auto-falling back to local compute worker ws://127.0.0.1:8765`);
          try {
            this.ws.close();
          } catch {}
          this.ws = null;
          this.url = 'ws://127.0.0.1:8765';
          if (typeof window !== 'undefined') {
            localStorage.setItem('sutra_gcs_ws_url', 'ws://127.0.0.1:8765');
          }
          this.connect('ws://127.0.0.1:8765');
        }
      }, 3500);
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        if (this.connectTimeout) {
          clearTimeout(this.connectTimeout);
          this.connectTimeout = null;
        }
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
        if (this.connectTimeout) {
          clearTimeout(this.connectTimeout);
          this.connectTimeout = null;
        }
        this.stopHeartbeat();
        useCommunicationStore.getState().setConnectionState('OFFLINE');
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        if (this.connectTimeout) {
          clearTimeout(this.connectTimeout);
          this.connectTimeout = null;
        }
        useCommunicationStore.getState().setError('WebSocket connection encountered an error');
      };
    } catch (err: any) {
      if (this.connectTimeout) {
        clearTimeout(this.connectTimeout);
        this.connectTimeout = null;
      }
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
    if (this.reconnectAttempts >= 2 && this.url !== 'ws://127.0.0.1:8765' && !this.url.includes('localhost')) {
      console.warn(`[WebSocketClient] Remote endpoint ${this.url} unreachable after retries. Auto-falling back to local compute worker ws://127.0.0.1:8765`);
      this.url = 'ws://127.0.0.1:8765';
      this.reconnectAttempts = 0;
      if (typeof window !== 'undefined') {
        localStorage.setItem('sutra_gcs_ws_url', 'ws://127.0.0.1:8765');
      }
      setTimeout(() => {
        this.connect('ws://127.0.0.1:8765');
      }, 500);
      return;
    }

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
