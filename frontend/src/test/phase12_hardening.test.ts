import { describe, it, expect, beforeEach, vi } from 'vitest';
import { messageRouter } from '../communication/MessageRouter';
import { commandManager } from '../communication/CommandManager';
import { wsClient } from '../communication/WebSocketClient';
import { useMissionStore } from '../stores/missionStore';
import { useTelemetryStore } from '../stores/telemetryStore';
import { useCommandStore } from '../stores/commandStore';

describe('SMART HORIZON GCS — Phase 12 Integration Hardening Tests', () => {
  beforeEach(() => {
    messageRouter.resetMetrics();
    useCommandStore.getState().clearHistory();
  });

  it('TEST A: Event Deduplication — drops duplicate event_id', () => {
    const eventId = 'ev-unique-12345';
    let counter = 0;

    const testEvent = {
      type: 'EVENT',
      event_id: eventId,
      event_type: 'mission.waypoint_reached',
      state_version: 200,
      timestamp: Date.now(),
      payload: { waypoint_index: 2 },
    };

    // First delivery
    messageRouter.routeMessage(testEvent);
    expect(useMissionStore.getState().active_waypoint_index).toBe(2);

    // Second duplicate delivery
    messageRouter.routeMessage(testEvent);
    expect(messageRouter.droppedDuplicateEventsCount).toBe(1);
  });

  it('TEST B: State Versioning — drops stale events and detects gaps', () => {
    const requestSnapshotSpy = vi.spyOn(wsClient, 'requestStateSnapshot').mockImplementation(() => {});

    // Deliver state version 100
    messageRouter.routeMessage({
      type: 'EVENT',
      event_id: 'ev-100',
      event_type: 'mission.started',
      state_version: 100,
      timestamp: Date.now(),
      payload: {},
    });
    expect(messageRouter.getLastStateVersion()).toBe(100);

    // Deliver stale version 95
    messageRouter.routeMessage({
      type: 'EVENT',
      event_id: 'ev-95',
      event_type: 'mission.paused',
      state_version: 95,
      timestamp: Date.now(),
      payload: {},
    });
    expect(messageRouter.droppedStaleEventsCount).toBe(1);

    // Deliver version with gap (e.g. 108)
    messageRouter.routeMessage({
      type: 'EVENT',
      event_id: 'ev-108',
      event_type: 'mission.started',
      state_version: 108,
      timestamp: Date.now(),
      payload: {},
    });
    expect(messageRouter.stateGapCount).toBe(1);
    expect(requestSnapshotSpy).toHaveBeenCalled();
  });

  it('TEST C: Out-of-Order Telemetry Rejection', () => {
    const droneId = 'drone_test_01';

    // Sequence 50 arrives
    messageRouter.routeMessage({
      type: 'EVENT',
      event_type: 'telemetry.updated',
      payload: {
        drone_id: droneId,
        sequence_number: 50,
        battery_percent: 85,
        altitude_agl: 30,
      },
    });
    expect(useTelemetryStore.getState().getTelemetry(droneId)?.battery_percent).toBe(85);

    // Sequence 48 arrives late (out-of-order)
    messageRouter.routeMessage({
      type: 'EVENT',
      event_type: 'telemetry.updated',
      payload: {
        drone_id: droneId,
        sequence_number: 48,
        battery_percent: 86,
        altitude_agl: 28,
      },
    });

    // 48 should be rejected
    expect(messageRouter.droppedOutOfOrderTelemCount).toBe(1);
    expect(useTelemetryStore.getState().getTelemetry(droneId)?.battery_percent).toBe(85);
  });
});
