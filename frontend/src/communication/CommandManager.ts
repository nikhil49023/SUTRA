/**
 * Smart Horizon GCS — Authoritative Command Manager & Watchdog
 * Subsystem: Communication & Command Lifecycle (Phase 13 Hardened)
 */

import { wsClient } from './WebSocketClient';
import { useCommandStore, CommandTrack } from '../stores/commandStore';
import { useAuthStore } from '../security/authStore';
import { CommandAck, CommandEnvelope } from '../types/communication';

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'cmd_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
};

export interface CommandOptions {
  timeoutMs?: number;
  correlationId?: string;
  onAck?: (ack: CommandAck) => void;
  onTimeout?: (cmdId: string) => void;
  onRollback?: (error: string) => void;
}

class CommandManager {
  private ackCallbacks: Map<string, (ack: CommandAck) => void> = new Map();
  private rollbackCallbacks: Map<string, (error: string) => void> = new Map();
  private watchdogTimers: Map<string, any> = new Map();
  private defaultTimeoutMs = 5000;

  public sendCommand<T = any>(
    commandType: string,
    payload: T,
    options?: CommandOptions
  ): string {
    const commandId = generateUUID();
    const correlationId = options?.correlationId || generateUUID();
    const timeoutMs = options?.timeoutMs || this.defaultTimeoutMs;
    const now = Date.now();
    const auth = useAuthStore.getState();

    // 1. Register in Command Store
    const trackItem: CommandTrack = {
      command_id: commandId,
      command_type: commandType,
      correlation_id: correlationId,
      status: 'SENT',
      sent_at: now,
      retry_count: 0,
      payload,
    };
    useCommandStore.getState().registerCommand(trackItem);

    // 2. Register callbacks
    if (options?.onAck) {
      this.ackCallbacks.set(commandId, options.onAck);
    }
    if (options?.onRollback) {
      this.rollbackCallbacks.set(commandId, options.onRollback);
    }

    // 3. Start Watchdog Timer
    const timer = setTimeout(() => {
      this.handleTimeout(commandId, commandType);
      if (options?.onTimeout) {
        options.onTimeout(commandId);
      }
    }, timeoutMs);
    this.watchdogTimers.set(commandId, timer);

    // 4. Construct Authenticated Envelope and Send
    const envelope: CommandEnvelope<T> & { session_id?: string | null; token?: string | null } = {
      command_id: commandId,
      command_type: commandType,
      timestamp: now / 1000,
      correlation_id: correlationId,
      session_id: auth.sessionId,
      token: auth.token,
      payload,
    };

    wsClient.sendRaw(JSON.stringify(envelope));
    return commandId;
  }

  public handleAck(ack: CommandAck): void {
    const cmdId = ack.command_id;
    this.clearWatchdog(cmdId);

    useCommandStore.getState().updateCommandStatus(cmdId, ack.status, ack.result, ack.error);

    const onAck = this.ackCallbacks.get(cmdId);
    if (onAck) {
      onAck(ack);
      this.ackCallbacks.delete(cmdId);
    }

    if (ack.status === 'REJECTED' || ack.status === 'FAILED') {
      const onRollback = this.rollbackCallbacks.get(cmdId);
      if (onRollback) {
        onRollback(ack.error || 'Command execution rejected by authoritative backend');
        this.rollbackCallbacks.delete(cmdId);
      }
    }
  }

  private handleTimeout(commandId: string, commandType: string): void {
    this.clearWatchdog(commandId);
    useCommandStore.getState().updateCommandStatus(
      commandId,
      'TIMEOUT',
      undefined,
      `Command '${commandType}' timed out after ${this.defaultTimeoutMs}ms`
    );

    const onRollback = this.rollbackCallbacks.get(commandId);
    if (onRollback) {
      onRollback(`Command '${commandType}' timed out with no server acknowledgement`);
      this.rollbackCallbacks.delete(commandId);
    }
  }

  private clearWatchdog(commandId: string): void {
    const timer = this.watchdogTimers.get(commandId);
    if (timer) {
      clearTimeout(timer);
      this.watchdogTimers.delete(commandId);
    }
  }
}

export const commandManager = new CommandManager();
