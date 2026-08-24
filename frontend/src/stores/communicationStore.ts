import { create } from 'zustand';
import { CommunicationState, ConnectionState } from '../types/communication';

interface CommunicationStoreState extends CommunicationState {
  wsUrl: string;
  setWsUrl: (url: string) => void;
  setConnectionState: (state: ConnectionState) => void;
  setMavlinkState: (state: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ACTIVE') => void;
  setLatency: (ms: number) => void;
  updateLatency: (ms: number) => void;
  incrementReconnectCount: () => void;
  recordReconnectAttempt: () => void;
  recordMessageReceived: (bytes?: number) => void;
  recordMessageSent: (bytes?: number) => void;
  setError: (error: string | null) => void;
  setStale: (stale: boolean) => void;
  hydrateFromSnapshot: (commsState: Partial<CommunicationState>) => void;
}

export const useCommunicationStore = create<CommunicationStoreState>((set) => ({
  websocket_state: 'DISCONNECTED',
  mavlink_state: 'DISCONNECTED',
  authenticated: false,
  heartbeat_ok: true,
  latency_ms: 0,
  reconnect_count: 0,
  messages_sent: 0,
  messages_received: 0,
  bytes_sent: 0,
  bytes_received: 0,
  last_error: null,
  connection_mode: 'WEBSOCKET',
  is_stale: false,
  wsUrl: 'ws://127.0.0.1:8765',

  setWsUrl: (url) => set({ wsUrl: url }),
  setConnectionState: (state) =>
    set({
      websocket_state: state,
      is_stale: state !== 'READY' && state !== 'CONNECTED',
    }),
  setMavlinkState: (state) => set({ mavlink_state: state }),
  setLatency: (latency_ms) => set({ latency_ms }),
  updateLatency: (latency_ms) => set({ latency_ms }),
  incrementReconnectCount: () => set((s) => ({ reconnect_count: s.reconnect_count + 1 })),
  recordReconnectAttempt: () => set((s) => ({ reconnect_count: s.reconnect_count + 1 })),
  recordMessageReceived: (bytes = 0) =>
    set((s) => ({
      messages_received: s.messages_received + 1,
      bytes_received: s.bytes_received + bytes,
      is_stale: false,
    })),
  recordMessageSent: (bytes = 0) =>
    set((s) => ({
      messages_sent: s.messages_sent + 1,
      bytes_sent: s.bytes_sent + bytes,
    })),
  setError: (last_error) => set({ last_error }),
  setStale: (is_stale) => set({ is_stale }),
  hydrateFromSnapshot: (commsState) => set((s) => ({ ...s, ...commsState, is_stale: false })),
}));
