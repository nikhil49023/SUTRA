/**
 * Smart Horizon GCS — Command Tracking Store
 * Tracks lifecycle states of in-flight and recent operational commands.
 */

import { create } from 'zustand';
import { CommandStatus } from '../types/communication';

export interface TrackedCommand {
  command_id: string;
  command_type: string;
  correlation_id: string;
  status: CommandStatus;
  sent_at: number;
  completed_at?: number;
  error?: string | null;
  payload?: any;
  result?: any;
  retry_count?: number;
}

export type CommandTrack = TrackedCommand;

interface CommandStoreState {
  commands: Record<string, TrackedCommand>;
  lastCommand: TrackedCommand | null;
  registerCommand: (cmd: TrackedCommand) => void;
  trackCommand: (cmd: TrackedCommand) => void;
  updateCommandStatus: (
    command_id: string,
    status: CommandStatus,
    result?: any,
    error?: string | null
  ) => void;
  clearHistory: () => void;
}

export const useCommandStore = create<CommandStoreState>((set) => ({
  commands: {},
  lastCommand: null,

  registerCommand: (cmd) =>
    set((state) => ({
      commands: { ...state.commands, [cmd.command_id]: cmd },
      lastCommand: cmd,
    })),

  trackCommand: (cmd) =>
    set((state) => ({
      commands: { ...state.commands, [cmd.command_id]: cmd },
      lastCommand: cmd,
    })),

  updateCommandStatus: (command_id, status, result, error) =>
    set((state) => {
      const existing = state.commands[command_id];
      if (!existing) return state;

      const updated: TrackedCommand = {
        ...existing,
        status,
        completed_at: status !== 'SENT' && status !== 'PENDING' ? Date.now() : undefined,
        error: error !== undefined ? error : existing.error,
        result: result !== undefined ? result : existing.result,
      };

      return {
        commands: { ...state.commands, [command_id]: updated },
        lastCommand: updated,
      };
    }),

  clearHistory: () => set({ commands: {}, lastCommand: null }),
}));
