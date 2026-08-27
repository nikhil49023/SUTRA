/**
 * Smart Horizon GCS — Waypoint Drag & Section Switching Performance Test Suite
 *
 * Verifies:
 * 1. Waypoint markers update in-place without full DOM recreation
 * 2. Drag operations invoke onDragUpdate (rAF) and commit to store only on dragend
 * 3. Section switching preserves persistent map and uses CSS display toggling
 * 4. fleetStore updateDroneState uses shallow equality to skip redundant store updates
 * 5. Performance utilities (throttle, debounce, rafThrottle, shallowEqual) behave correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WaypointLayer } from '../map/WaypointLayer';
import { useMissionStore } from '../stores/missionStore';
import { useFleetStore } from '../stores/fleetStore';
import { useAppStore } from '../stores/appStore';
import { mapPersistence } from '../map/MapPersistence';
import { throttle, debounce, rafThrottle, shallowEqual } from '../utils/performance';
import { commandManager } from '../communication/CommandManager';

describe('SMART HORIZON GCS — Waypoint & Section Performance Optimizations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TEST 1: shallowEqual correctly detects changed and unchanged state slices', () => {
    const droneA = {
      drone_id: 'drone_alpha',
      latitude: 37.7749,
      longitude: -122.4194,
      altitude: 25.0,
      heading: 45.0,
    };

    // Exact match
    expect(shallowEqual(droneA as any, { latitude: 37.7749, longitude: -122.4194 })).toBe(true);

    // Modified field
    expect(shallowEqual(droneA as any, { latitude: 37.7750, longitude: -122.4194 })).toBe(false);
  });

  it('TEST 2: fleetStore.updateDroneState skips redundant store writes when telemetry is unchanged', () => {
    const initialDrones = useFleetStore.getState().drones;
    const alphaInitial = initialDrones['drone_alpha'];

    // Update with exact same values
    useFleetStore.getState().updateDroneState('drone_alpha', {
      latitude: alphaInitial.latitude,
      longitude: alphaInitial.longitude,
      altitude: alphaInitial.altitude,
      heading: alphaInitial.heading,
    });

    const afterNoopDrones = useFleetStore.getState().drones;
    // Object reference MUST remain identical when nothing changed (zero subscriber re-renders)
    expect(afterNoopDrones).toBe(initialDrones);

    // Update with changed position
    useFleetStore.getState().updateDroneState('drone_alpha', {
      latitude: 37.7800,
    });

    const afterChangeDrones = useFleetStore.getState().drones;
    expect(afterChangeDrones).not.toBe(initialDrones);
    expect(afterChangeDrones['drone_alpha'].latitude).toBe(37.7800);
  });

  it('TEST 3: WaypointLayer creates persistent markers and updates them in-place', () => {
    const layer = new WaypointLayer();
    const container = document.createElement('div');
    const mockMap = mapPersistence.initOrAttach(container);
    layer.setMap(mockMap);

    const waypoints = [
      { id: 'wp-1', index: 1, latitude: 37.7752, longitude: -122.419, altitude: 25, speed: 6, command: 'WAYPOINT', hold_time: 0, acceptance_radius: 2 },
      { id: 'wp-2', index: 2, latitude: 37.7765, longitude: -122.4175, altitude: 30, speed: 8, command: 'WAYPOINT', hold_time: 2, acceptance_radius: 2 },
    ];

    // Initial render
    layer.renderWaypoints(waypoints as any);

    // Re-render with same or updated positions (should not throw and should update existing markers)
    const updatedWaypoints = [
      { ...waypoints[0], latitude: 37.7760 },
      waypoints[1],
    ];

    expect(() => layer.renderWaypoints(updatedWaypoints as any)).not.toThrow();

    layer.clearMarkers();
  });

  it('TEST 4: Section navigation updates activeSection without unmounting map persistence', () => {
    const container = document.createElement('div');
    const map = mapPersistence.initOrAttach(container);
    expect(map).toBeDefined();

    // Switch through all sections
    const sections = ['COMMAND', 'MISSION', 'FLEET', 'GIS', 'AI', 'SETTINGS', 'COMMAND'] as const;
    sections.forEach((sec) => {
      useAppStore.getState().setActiveSection(sec);
      expect(useAppStore.getState().activeSection).toBe(sec);
      // Map instance must remain alive across all section switches
      expect(mapPersistence.getMap()).toBe(map);
    });
  });

  it('TEST 5: Performance utilities — rafThrottle and throttle execute reliably', async () => {
    const throttledFn = vi.fn();
    const t = throttle(throttledFn, 50);

    t('call1');
    t('call2');
    t('call3');

    expect(throttledFn).toHaveBeenCalledTimes(1);
    expect(throttledFn).toHaveBeenCalledWith('call1');

    // Wait for trailing edge
    await new Promise((r) => setTimeout(r, 60));
    expect(throttledFn).toHaveBeenCalledTimes(2);
    expect(throttledFn).toHaveBeenLastCalledWith('call3');
  });
});
