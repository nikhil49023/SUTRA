/**
 * Smart Horizon GCS — Geofence Red Zone Notifications Test Suite
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useGeofenceNotificationStore } from '../geofence/GeofenceNotificationStore';
import { evaluateDroneGeofenceProximity } from '../geofence/GeofenceBreachEngine';
import { Geofence } from '../types/geofence';

describe('SMART HORIZON GCS — Geofence Red Zone Notification Engine Suite', () => {
  const mockRedZone: Geofence = {
    id: 'gf-nuclear-nfz',
    name: 'Critical Infrastructure NFZ',
    zone_type: 'NO_FLY',
    geometry_type: 'POLYGON',
    coordinates: [
      [37.77, -122.42],
      [37.78, -122.42],
      [37.78, -122.41],
      [37.77, -122.41],
    ],
    altitude_min: 0,
    altitude_max: 150,
    priority: 5,
    enabled: true,
    visible: true,
  };

  beforeEach(() => {
    useGeofenceNotificationStore.getState().clearNotifications();
  });

  it('TEST 1: Ingests and triggers critical notification when drone moves inside Red Zone', () => {
    const store = useGeofenceNotificationStore.getState();

    // Drone inside polygon
    const prox = evaluateDroneGeofenceProximity(
      {
        id: 'uav-alpha',
        name: 'UAV-ALPHA',
        latitude: 37.775,
        longitude: -122.415,
        altitude: 45,
        speed: 8.5,
        heading: 90,
      },
      mockRedZone
    );

    expect(prox.is_inside).toBe(true);
    expect(prox.severity).toBe('CRITICAL_BREACH');

    store.ingestProximityEvaluation([
      {
        drone_id: 'uav-alpha',
        drone_name: 'UAV-ALPHA',
        geofence_id: mockRedZone.id,
        geofence_name: mockRedZone.name,
        zone_type: mockRedZone.zone_type,
        severity: 'CRITICAL_RED_ZONE',
        message: 'CRITICAL RED ZONE INTRUSION: UAV-ALPHA inside Critical Infrastructure NFZ',
        latitude: 37.775,
        longitude: -122.415,
        altitude: 45,
        speed: 8.5,
        heading: 90,
        distance_to_boundary_m: prox.distance_to_boundary_m,
        time_to_breach_s: prox.time_to_breach_s,
        is_inside: prox.is_inside,
      },
    ]);

    const notifs = useGeofenceNotificationStore.getState().notifications;
    expect(notifs.length).toBe(1);
    expect(notifs[0].severity).toBe('CRITICAL_RED_ZONE');
    expect(notifs[0].acknowledged).toBe(false);
    expect(notifs[0].drone_id).toBe('uav-alpha');
  });

  it('TEST 2: Deduplicates continuous notifications for the same drone and updates telemetry', () => {
    const store = useGeofenceNotificationStore.getState();

    // First detection
    store.ingestProximityEvaluation([
      {
        drone_id: 'uav-bravo',
        drone_name: 'UAV-BRAVO',
        geofence_id: mockRedZone.id,
        geofence_name: mockRedZone.name,
        zone_type: mockRedZone.zone_type,
        severity: 'CRITICAL_RED_ZONE',
        message: 'Initial intrusion',
        latitude: 37.775,
        longitude: -122.415,
        altitude: 30,
        speed: 5.0,
        heading: 45,
        distance_to_boundary_m: 10,
        time_to_breach_s: null,
        is_inside: true,
      },
    ]);

    expect(useGeofenceNotificationStore.getState().notifications.length).toBe(1);

    // Second continuous tick
    store.ingestProximityEvaluation([
      {
        drone_id: 'uav-bravo',
        drone_name: 'UAV-BRAVO',
        geofence_id: mockRedZone.id,
        geofence_name: mockRedZone.name,
        zone_type: mockRedZone.zone_type,
        severity: 'CRITICAL_RED_ZONE',
        message: 'Updated position in zone',
        latitude: 37.776,
        longitude: -122.416,
        altitude: 35,
        speed: 6.2,
        heading: 50,
        distance_to_boundary_m: 15,
        time_to_breach_s: null,
        is_inside: true,
      },
    ]);

    const notifs = useGeofenceNotificationStore.getState().notifications;
    expect(notifs.length).toBe(1);
    expect(notifs[0].altitude).toBe(35);
    expect(notifs[0].speed).toBe(6.2);
  });

  it('TEST 3: Acknowledges notification and records timestamp', () => {
    const store = useGeofenceNotificationStore.getState();

    store.ingestProximityEvaluation([
      {
        drone_id: 'uav-charlie',
        drone_name: 'UAV-CHARLIE',
        geofence_id: mockRedZone.id,
        geofence_name: mockRedZone.name,
        zone_type: mockRedZone.zone_type,
        severity: 'CRITICAL_RED_ZONE',
        message: 'Critical breach',
        latitude: 37.774,
        longitude: -122.414,
        altitude: 20,
        speed: 4.0,
        heading: 0,
        distance_to_boundary_m: 5,
        time_to_breach_s: null,
        is_inside: true,
      },
    ]);

    const notifId = useGeofenceNotificationStore.getState().notifications[0].id;
    store.acknowledgeNotification(notifId);

    const updated = useGeofenceNotificationStore.getState().notifications[0];
    expect(updated.acknowledged).toBe(true);
    expect(updated.acknowledged_at).toBeDefined();
  });

  it('TEST 4: Emergency RTL action triggers command and acknowledges alert', () => {
    const store = useGeofenceNotificationStore.getState();

    store.ingestProximityEvaluation([
      {
        drone_id: 'uav-delta',
        drone_name: 'UAV-DELTA',
        geofence_id: mockRedZone.id,
        geofence_name: mockRedZone.name,
        zone_type: mockRedZone.zone_type,
        severity: 'CRITICAL_RED_ZONE',
        message: 'Red zone breach',
        latitude: 37.775,
        longitude: -122.415,
        altitude: 50,
        speed: 10.0,
        heading: 180,
        distance_to_boundary_m: 2,
        time_to_breach_s: null,
        is_inside: true,
      },
    ]);

    const notifId = useGeofenceNotificationStore.getState().notifications[0].id;
    store.triggerEmergencyRtl('uav-delta', notifId);

    const updated = useGeofenceNotificationStore.getState().notifications[0];
    expect(updated.action_taken).toBe('EMERGENCY_RTL_ENGAGED');
    expect(updated.acknowledged).toBe(true);
  });

  it('TEST 5: Audio mute toggle functions correctly', () => {
    const store = useGeofenceNotificationStore.getState();
    expect(store.isAudioMuted).toBe(false);

    store.toggleAudioMute();
    expect(useGeofenceNotificationStore.getState().isAudioMuted).toBe(true);

    store.toggleAudioMute();
    expect(useGeofenceNotificationStore.getState().isAudioMuted).toBe(false);
  });
});
