import { describe, it, expect, beforeEach, vi } from 'vitest';
import { commandManager } from '../communication/CommandManager';
import { messageRouter } from '../communication/MessageRouter';
import { useCommandStore } from '../stores/commandStore';

describe('SMART HORIZON GCS — Command Lifecycle, ACK & Rollback Tests', () => {
  beforeEach(() => {
    useCommandStore.getState().clearHistory();
  });

  it('TEST A: Command dispatch records SENT status with unique command_id', () => {
    const cmdId = commandManager.sendCommand('mission.start', { test: true });
    expect(cmdId).toBeDefined();

    const tracked = useCommandStore.getState().commands[cmdId];
    expect(tracked).toBeDefined();
    expect(tracked.status).toBe('SENT');
    expect(tracked.command_type).toBe('mission.start');
  });

  it('TEST B: Command ACK transitions status to ACCEPTED', () => {
    let ackReceived = false;
    const cmdId = commandManager.sendCommand('fleet.set_formation', { formation: 'DIAMOND' }, {
      onAck: (ack) => {
        ackReceived = true;
      },
    });

    // Deliver ACK from backend
    messageRouter.routeMessage({
      type: 'COMMAND_ACK',
      command_id: cmdId,
      command_type: 'fleet.set_formation',
      correlation_id: 'corr-123',
      status: 'ACCEPTED',
      state_version: 150,
      timestamp: Date.now(),
      result: { formation: 'DIAMOND' },
    });

    expect(ackReceived).toBe(true);
    const tracked = useCommandStore.getState().commands[cmdId];
    expect(tracked.status).toBe('ACCEPTED');
  });

  it('TEST C: Command Rejection triggers rollback handler', () => {
    let rolledBack = false;
    let rollbackError = '';

    const cmdId = commandManager.sendCommand('mission.update_waypoint', { altitude: 500 }, {
      onRollback: (err) => {
        rolledBack = true;
        rollbackError = err;
      },
    });

    // Deliver REJECTED ACK
    messageRouter.routeMessage({
      type: 'COMMAND_ACK',
      command_id: cmdId,
      command_type: 'mission.update_waypoint',
      correlation_id: 'corr-456',
      status: 'REJECTED',
      error: 'Altitude 500m exceeds maximum airspace ceiling (120m AGL)',
      state_version: 151,
      timestamp: Date.now(),
    });

    expect(rolledBack).toBe(true);
    expect(rollbackError).toContain('Altitude 500m exceeds maximum airspace ceiling');
    const tracked = useCommandStore.getState().commands[cmdId];
    expect(tracked.status).toBe('REJECTED');
  });
});
