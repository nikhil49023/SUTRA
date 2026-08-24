import { describe, it, expect, beforeEach } from 'vitest';
import { messageRouter } from '../communication/MessageRouter';
import { useFleetStore } from '../stores/fleetStore';
import { useMissionStore } from '../stores/missionStore';
import { useGeofenceStore } from '../stores/geofenceStore';
import { useMapStore } from '../stores/mapStore';
import { commandManager } from '../communication/CommandManager';
import { useCommandStore } from '../stores/commandStore';

describe('SMART HORIZON GCS — Phase 14 Integration & Reliability Test Suite', () => {
  beforeEach(() => {
    messageRouter.resetMetrics();
    useMapStore.getState().setInteractionMode('SELECT');
  });

  it('TEST 1: Multi-Drone Swarm Movement — independent telemetry routing for 3 drones', () => {
    // Deliver Alpha, Bravo, Charlie positions in same tick
    const tickTime = Date.now();
    ['drone_alpha', 'drone_bravo', 'drone_charlie'].forEach((d_id, idx) => {
      messageRouter.routeMessage({
        type: 'EVENT',
        event_type: 'telemetry.updated',
        event_id: `evt_telem_${d_id}_${tickTime}`,
        state_version: 50, // All drones share same state_version in simulation tick
        payload: {
          drone_id: d_id,
          sequence_number: 100,
          latitude: 37.7750 + idx * 0.001,
          longitude: -122.4190 + idx * 0.001,
          altitude_agl: 30.0,
          heading: 90.0,
          ground_speed: 6.0,
          battery_percent: 95.0 - idx * 2.0,
        },
      });
    });

    const drones = useFleetStore.getState().drones;
    expect(drones['drone_alpha'].latitude).toBeCloseTo(37.7750, 4);
    expect(drones['drone_bravo'].latitude).toBeCloseTo(37.7760, 4);
    expect(drones['drone_charlie'].latitude).toBeCloseTo(37.7770, 4);

    // Ensure none of the follower drones were dropped as stale
    expect(messageRouter.droppedStaleEventsCount).toBe(0);
  });

  it('TEST 2: Selection isolation — selecting drone does not halt fleet telemetry ingestion', () => {
    useFleetStore.getState().setSelectedDroneId('drone_charlie');
    expect(useFleetStore.getState().selectedDroneId).toBe('drone_charlie');

    messageRouter.routeMessage({
      type: 'EVENT',
      event_type: 'telemetry.updated',
      event_id: `evt_telem_alpha_iso_${Date.now()}`,
      state_version: 51,
      payload: {
        drone_id: 'drone_alpha',
        sequence_number: 101,
        latitude: 37.7800,
        longitude: -122.4100,
        altitude_agl: 35.0,
        heading: 90.0,
        ground_speed: 6.5,
        battery_percent: 94.0,
      },
    });

    expect(useFleetStore.getState().drones['drone_alpha'].latitude).toBeCloseTo(37.7800, 4);
  });

  it('TEST 3: Dashboard Waypoint placement mode and optimistic preview lifecycle', () => {
    const mapStore = useMapStore.getState();
    mapStore.setInteractionMode('ADD_WAYPOINT');
    expect(useMapStore.getState().interactionMode).toBe('ADD_WAYPOINT');

    // Simulate clicking map
    mapStore.setLastMapClick(37.7850, -122.4050);
    mapStore.setPreviewWaypoint({ latitude: 37.7850, longitude: -122.4050, altitude: 25.0, speed: 6.0 });
    mapStore.setLastWaypointCommandStatus('SENT');

    expect(useMapStore.getState().previewWaypoint).toBeDefined();
    expect(useMapStore.getState().lastWaypointCommandStatus).toBe('SENT');

    // Simulate Backend event emission
    messageRouter.routeMessage({
      type: 'EVENT',
      event_type: 'mission.waypoint_added',
      event_id: `evt_wp_add_${Date.now()}`,
      state_version: 52,
      payload: {
        waypoint: {
          id: 'wp_test_101',
          index: 5,
          latitude: 37.7850,
          longitude: -122.4050,
          altitude: 25.0,
          speed: 6.0,
          command: 'WAYPOINT',
          hold_time: 0,
          acceptance_radius: 2.0,
        },
      },
    });

    const wps = useMissionStore.getState().waypoints;
    expect(wps.some((w) => w.id === 'wp_test_101')).toBe(true);
  });

  it('TEST 4: Geofence Interactive Drawing & Lifecycle in Frontend Store', () => {
    const gfStore = useGeofenceStore.getState();
    gfStore.startDrawing('NO_FLY', 'POLYGON');
    expect(useGeofenceStore.getState().drawing_mode).toBe(true);
    expect(useGeofenceStore.getState().active_zone_type).toBe('NO_FLY');

    // Add 3 points
    gfStore.addDrawingPoint(37.770, -122.420);
    gfStore.addDrawingPoint(37.772, -122.420);
    gfStore.addDrawingPoint(37.772, -122.418);
    expect(useGeofenceStore.getState().drawing_points.length).toBe(3);

    // Rubberband preview
    gfStore.updatePreviewPoint(37.771, -122.419);
    expect(useGeofenceStore.getState().preview_point).toEqual([37.771, -122.419]);

    // Undo point
    gfStore.undoDrawingPoint();
    expect(useGeofenceStore.getState().drawing_points.length).toBe(2);

    // Cancel drawing
    gfStore.cancelDrawing();
    expect(useGeofenceStore.getState().drawing_mode).toBe(false);
    expect(useGeofenceStore.getState().drawing_points.length).toBe(0);
  });

  it('TEST 5: Full State Snapshot Hydration restores all operational layers', () => {
    messageRouter.routeMessage({
      type: 'STATE_SNAPSHOT',
      state_version: 100,
      timestamp: Date.now(),
      payload: {
        application: { application_status: 'READY' },
        mission: {
          waypoints: [
            { id: 'wp_snap_1', index: 1, latitude: 37.7749, longitude: -122.4194, altitude: 30.0, speed: 5.0 },
          ],
          home_latitude: 37.7749,
          home_longitude: -122.4194,
        },
        fleet: {
          formation: 'DIAMOND',
          spacing: 30.0,
          drones: {
            drone_alpha: { drone_id: 'drone_alpha', callsign: 'Alpha', latitude: 37.7749, longitude: -122.4194, altitude: 30.0, speed: 6.0, battery: 90.0 },
            drone_bravo: { drone_id: 'drone_bravo', callsign: 'Bravo', latitude: 37.7740, longitude: -122.4190, altitude: 30.0, speed: 6.0, battery: 85.0 },
          },
        },
        geofence: {
          geofences: [
            { id: 'gf_snap_1', name: 'Snap NFZ', zone_type: 'NO_FLY', geometry_type: 'POLYGON', coordinates: [[37.77, -122.42], [37.78, -122.42], [37.78, -122.41]], visible: true, enabled: true },
          ],
        },
      },
    });

    expect(useMissionStore.getState().waypoints.length).toBe(1);
    expect(useFleetStore.getState().formation).toBe('DIAMOND');
    expect(useFleetStore.getState().drones['drone_alpha'].callsign).toBe('Alpha');
    expect(useGeofenceStore.getState().geofences.length).toBe(1);
  });
});
