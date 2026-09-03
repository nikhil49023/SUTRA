import { describe, it, expect, beforeEach } from 'vitest';
import { messageRouter } from '../communication/MessageRouter';
import { useFleetStore } from '../stores/fleetStore';
import { useTelemetryStore } from '../stores/telemetryStore';

describe('SMART HORIZON GCS — Multi-Drone Swarm Formation Movement Tests', () => {
  beforeEach(() => {
    messageRouter.resetMetrics();
  });

  it('TEST 1: Telemetry updates position for every drone independently', () => {
    // Deliver Alpha position
    messageRouter.routeMessage({
      type: 'EVENT',
      event_type: 'telemetry.updated',
      payload: {
        drone_id: 'drone_alpha',
        sequence_number: 10,
        latitude: 37.7750,
        longitude: -122.4190,
        altitude_agl: 30.0,
        heading: 45.0,
        ground_speed: 6.0,
        battery_percent: 98.0,
      },
    });

    // Deliver Bravo position
    messageRouter.routeMessage({
      type: 'EVENT',
      event_type: 'telemetry.updated',
      payload: {
        drone_id: 'drone_bravo',
        sequence_number: 10,
        latitude: 37.7748,
        longitude: -122.4192,
        altitude_agl: 30.0,
        heading: 45.0,
        ground_speed: 6.0,
        battery_percent: 95.0,
      },
    });

    // Deliver Charlie position
    messageRouter.routeMessage({
      type: 'EVENT',
      event_type: 'telemetry.updated',
      payload: {
        drone_id: 'drone_charlie',
        sequence_number: 10,
        latitude: 37.7748,
        longitude: -122.4188,
        altitude_agl: 30.0,
        heading: 45.0,
        ground_speed: 6.0,
        battery_percent: 92.0,
      },
    });

    const fleet = useFleetStore.getState().drones;
    expect(fleet['drone_alpha'].latitude).toBe(37.7750);
    expect(fleet['drone_bravo'].latitude).toBe(37.7748);
    expect(fleet['drone_charlie'].latitude).toBe(37.7748);

    expect(fleet['drone_alpha'].longitude).toBe(-122.4190);
    expect(fleet['drone_bravo'].longitude).toBe(-122.4192);
    expect(fleet['drone_charlie'].longitude).toBe(-122.4188);
  });

  it('TEST 2: Selecting a follower drone does not halt movement of any drone', () => {
    useFleetStore.getState().setSelectedDroneId('drone_bravo');
    expect(useFleetStore.getState().selectedDroneId).toBe('drone_bravo');

    // Movement updates continue for Alpha, Bravo, Charlie
    messageRouter.routeMessage({
      type: 'EVENT',
      event_type: 'telemetry.updated',
      payload: {
        drone_id: 'drone_alpha',
        sequence_number: 11,
        latitude: 37.7755,
        longitude: -122.4185,
        altitude_agl: 30.0,
        heading: 45.0,
        ground_speed: 6.0,
        battery_percent: 97.9,
      },
    });

    messageRouter.routeMessage({
      type: 'EVENT',
      event_type: 'telemetry.updated',
      payload: {
        drone_id: 'drone_bravo',
        sequence_number: 11,
        latitude: 37.7753,
        longitude: -122.4187,
        altitude_agl: 30.0,
        heading: 45.0,
        ground_speed: 6.0,
        battery_percent: 94.9,
      },
    });

    const fleet = useFleetStore.getState().drones;
    expect(fleet['drone_alpha'].latitude).toBe(37.7755);
    expect(fleet['drone_bravo'].latitude).toBe(37.7753);
  });

  it('TEST 3: Dynamic drone addition and removal in frontend store', () => {
    // Add 5th drone
    useFleetStore.getState().addDrone({
      drone_id: 'drone_echo',
      callsign: 'ECHO (NEW)',
      role: 'WINGMAN',
      latitude: 37.7745,
      longitude: -122.4190,
      altitude: 25.0,
      heading: 45.0,
      pitch: 0,
      roll: 0,
      speed: 6.0,
      battery: 100.0,
      connection_status: 'CONNECTED',
      flight_mode: 'MISSION',
      is_leader: false,
      formation_index: 4,
      offset_x: 0,
      offset_y: -75,
      formation: 'V_FORMATION',
    });

    expect(useFleetStore.getState().drones['drone_echo']).toBeDefined();

    // Remove drone
    useFleetStore.getState().removeDrone('drone_echo');
    expect(useFleetStore.getState().drones['drone_echo']).toBeUndefined();
  });
});
