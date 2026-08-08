export type ConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'AUTHENTICATING'
  | 'READY'
  | 'RECONNECTING'
  | 'TIMEOUT'
  | 'FAILED'
  | 'FALLBACK';

export type ChannelType = 'MISSION' | 'TELEMETRY' | 'AI' | 'VIDEO' | 'LOGS';

export interface PacketHeader {
  topic: string;
  channel: ChannelType;
  sequence: number;
  timestamp: number;
  compressed?: boolean;
}

export interface NetworkPacket<T = any> {
  header: PacketHeader;
  payload: T;
}
