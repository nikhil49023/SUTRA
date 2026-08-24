import { describe, it, expect, beforeEach } from 'vitest';
import { useMissionStore } from '../stores/missionStore';
import { useFleetStore } from '../stores/fleetStore';
import { useTelemetryStore } from '../stores/telemetryStore';
import { useGeofenceStore } from '../stores/geofenceStore';
import { useAIStore } from '../stores/aiStore';
import { useAlertStore } from '../stores/alertStore';
import { useCommunicationStore } from '../stores/communicationStore';
import { messageRouter } from '../communication/MessageRouter';

describe('SMART HORIZON GCS — Zustand Stores & State Hydration', () => {
  beforeEach(() => {
    useAlertStore.getState().clearAlerts();
  });

  it('hydrates mission, fleet, and geofence from STATE_SNAPSHOT', () => {
    const snapshotPayload = {
      mission: {
        mission_id: 'test-mission-99',
        mission_name: 'DELTA RECON',
        state: 'READY',
        waypoints: [
          { id: 'wp-1', index: 1, latitude: 20.5937, longitude: 78.9629, altitude: 20, speed: 5 },
          { id: 'wp-2', index: 2, latitude: 20.5950, longitude: 78.9640, altitude: 25, speed: 7 },
        ],
        distance_remaining: 1500,
      },
      fleet: {
        leader_id: 'uav_alpha',
        formation: 'DIAMOND',
        spacing: 30,
        drones: {
          uav_alpha: {
            drone_id: 'uav_alpha',
            callsign: 'ALPHA LEADER',
            role: 'LEADER',
            latitude: 20.5937,
            longitude: 78.9629,
            altitude: 20,
            heading: 90,
            pitch: 0,
            roll: 0,
            speed: 5,
            battery: 99,
            connection_status: 'CONNECTED',
            flight_mode: 'MISSION',
            is_leader: true,
            formation_index: 0,
          },
        },
      },
      geofence: {
        geofences: [
          {
            id: 'gf-snap-1',
            name: 'Flood Zone NFZ',
            zone_type: 'NO_FLY',
            geometry_type: 'POLYGON',
            coordinates: [[20.59, 78.96], [20.60, 78.96], [20.60, 78.97]],
            altitude_min: 0,
            altitude_max: 100,
            enabled: true,
            visible: true,
          },
        ],
      },
    };

    messageRouter.routeMessage({
      type: 'STATE_SNAPSHOT',
      payload: snapshotPayload,
    });

    expect(useMissionStore.getState().mission_name).toBe('DELTA RECON');
    expect(useMissionStore.getState().waypoints.length).toBe(2);
    expect(useFleetStore.getState().formation).toBe('DIAMOND');
    expect(useFleetStore.getState().spacing).toBe(30);
    expect(useGeofenceStore.getState().geofences.length).toBe(1);
    expect(useGeofenceStore.getState().geofences[0].name).toBe('Flood Zone NFZ');
  });

  it('handles telemetry updates properly', () => {
    messageRouter.routeMessage({
      type: 'EVENT',
      topic: 'telemetry.updated',
      payload: {
        drone_id: 'drone_alpha',
        latitude: 37.7799,
        longitude: -122.4155,
        altitude_agl: 45.0,
        battery_percent: 88.5,
        heading: 180,
      },
    });

    const telem = useTelemetryStore.getState().getTelemetry('drone_alpha');
    expect(telem?.latitude).toBe(37.7799);
    expect(telem?.altitude_agl).toBe(45.0);
    expect(telem?.battery_percent).toBe(88.5);
    expect(telem?.heading).toBe(180);
  });

  it('manages alerts and acknowledgment lifecycle', () => {
    const alertStore = useAlertStore.getState();
    alertStore.addAlert({
      severity: 'EMERGENCY',
      title: 'Geofence Breach',
      message: 'UAV Alpha breached NO-FLY ZONE',
      source: 'geofence_monitor',
    });

    expect(useAlertStore.getState().alerts.length).toBe(1);
    expect(useAlertStore.getState().unreadCount).toBe(1);
    expect(useAlertStore.getState().alerts[0].acknowledged).toBe(false);

    const alertId = useAlertStore.getState().alerts[0].alert_id;
    useAlertStore.getState().acknowledgeAlert(alertId);

    expect(useAlertStore.getState().unreadCount).toBe(0);
    expect(useAlertStore.getState().alerts[0].acknowledged).toBe(true);
  });

  it('handles AI recommendations decisions', () => {
    const aiStore = useAIStore.getState();
    const recId = 'rec-test-01';

    messageRouter.routeMessage({
      type: 'EVENT',
      topic: 'ai.recommendation',
      payload: {
        recommendation: {
          recommendation_id: recId,
          title: 'Return to Home',
          message: 'Predicted reserve 14% is below required 18%',
          reason: 'Strong headwinds',
          severity: 'HIGH',
          requires_operator_approval: true,
          status: 'PENDING',
          confidence: 0.87,
          source: 'battery_advisor',
          timestamp: Date.now(),
        },
      },
    });

    const rec = useAIStore.getState().recommendations.find((r) => r.recommendation_id === recId);
    expect(rec).toBeDefined();
    expect(rec?.status).toBe('PENDING');

    useAIStore.getState().updateRecommendationStatus(recId, 'ACCEPTED');
    const updated = useAIStore.getState().recommendations.find((r) => r.recommendation_id === recId);
    expect(updated?.status).toBe('ACCEPTED');
  });

  it('marks state as stale on disconnect and clears stale on message received', () => {
    const commStore = useCommunicationStore.getState();
    commStore.setConnectionState('RECONNECTING');

    expect(useCommunicationStore.getState().is_stale).toBe(true);

    commStore.recordMessageReceived(100);
    expect(useCommunicationStore.getState().is_stale).toBe(false);
  });
});
