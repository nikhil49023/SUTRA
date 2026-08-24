/**
 * Smart Horizon GCS — Phase 12 Production WebSocket & Command Types
 */

export type ConnectionState = 'CONNECTED' | 'SYNCING' | 'STALE' | 'RECONNECTING' | 'OFFLINE' | 'READY' | 'DISCONNECTED';

export interface CommunicationState {
  websocket_state: ConnectionState | string;
  mavlink_state: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ACTIVE' | string;
  authenticated: boolean;
  heartbeat_ok: boolean;
  latency_ms: number;
  reconnect_count: number;
  messages_sent: number;
  messages_received: number;
  bytes_sent: number;
  bytes_received: number;
  last_error: string | null;
  connection_mode: string;
  is_stale: boolean;
}

export type CommandStatus = 'PENDING' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'FAILED' | 'TIMEOUT';

export interface CommandEnvelope<T = any> {
  command_id: string;
  command_type: string;
  timestamp: number;
  correlation_id: string;
  payload: T;
}

export interface EventEnvelope<T = any> {
  event_id: string;
  event_type: string;
  state_version: number;
  timestamp: number;
  correlation_id?: string;
  payload: T;
}

export interface CommandAck {
  type: 'COMMAND_ACK';
  command_id: string;
  command_type: string;
  correlation_id: string;
  status: 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'FAILED';
  result?: any;
  error?: string | null;
  state_version: number;
  timestamp: number;
}

export interface StateSnapshotEnvelope {
  type: 'STATE_SNAPSHOT';
  state_version: number;
  timestamp: number;
  correlation_id?: string;
  payload: any;
}
