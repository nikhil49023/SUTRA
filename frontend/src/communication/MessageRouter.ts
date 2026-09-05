/**
 * Smart Horizon GCS — Phase 13 Production Message & Event Router
 * Enforces:
 * 1. Multi-Drone Authoritative Position Synchronization (Alpha, Bravo, Charlie, Delta, etc.)
 * 2. Event Deduplication (LRU event_id cache)
 * 3. State Versioning & Gap Recovery (REQUEST_STATE_SNAPSHOT)
 *    NOTE: Telemetry events are EXEMPT from global state version filtering.
 *          All drones in the same simulation tick share an identical state_version.
 *          Filtering by global version would drop every follower drone's telemetry.
 *          Per-drone sequence numbers (section C) handle ordering for telemetry.
 * 4. Telemetry Sequence Ordering per Drone (Drops out-of-order packets per drone)
 * 5. Command ACK Routing to CommandManager
 * 6. Authentication & Session Response Routing
 * 7. Authoritative Store Hydration
 */

/** Event types exempt from global state-version filtering (use per-drone sequences) */
const TELEMETRY_EVENT_TYPES = new Set([
  'telemetry.updated',
  'TELEMETRY_UPDATED',
  'fleet.drone_position_updated',
  'FLEET_DRONE_POSITION_UPDATED',
]);

import { useMissionStore } from '../stores/missionStore';
import { useFleetStore } from '../stores/fleetStore';
import { useTelemetryStore } from '../stores/telemetryStore';
import { useGeofenceStore } from '../stores/geofenceStore';
import { useGISStore } from '../stores/gisStore';
import { useAIStore } from '../stores/aiStore';
import { useRiskStore } from '../stores/riskStore';
import { useAlertStore } from '../stores/alertStore';
import { useDefensiveUpgradesStore } from '../stores/defensiveUpgradesStore';
import { useCommunicationStore } from '../stores/communicationStore';
import { useAuthStore } from '../security/authStore';
import { useCameraStore } from '../stores/cameraStore';
import { commandManager } from './CommandManager';
import { wsClient } from './WebSocketClient';
import { CommandAck, EventEnvelope } from '../types/communication';

class MessageRouter {
  // LRU Event Cache (Capacity 500)
  private processedEventIds: Set<string> = new Set();
  private eventIdQueue: string[] = [];
  private maxEventCacheSize = 500;

  // State Version Tracker
  private lastStateVersion = 0;

  // Monotonic Telemetry Sequence Tracker per Drone
  private lastTelemetrySequence: Record<string, number> = {};

  // Metrics for Debug Panel
  public droppedStaleEventsCount = 0;
  public droppedDuplicateEventsCount = 0;
  public droppedOutOfOrderTelemCount = 0;
  public stateGapCount = 0;
  public lastProcessedEventId: string | null = null;

  public routeMessage(message: any): void {
    if (!message || typeof message !== 'object') return;

    const msgType = message.type || message.event_type;

    // 1. AUTHENTICATION RESPONSES
    if (msgType === 'AUTH_RESPONSE') {
      if (message.status === 'SUCCESS' && message.user) {
        useAuthStore.getState().setAuthenticated(
          message.user,
          message.token,
          message.session_id,
          message.expires_at
        );
      } else if (message.status === 'FAILED') {
        useAuthStore.getState().setError(message.error || 'Authentication failed');
        useAuthStore.getState().setSessionStatus('UNAUTHENTICATED');
      } else if (message.status === 'EXPIRED') {
        useAuthStore.getState().setSessionStatus('EXPIRED');
      }
      return;
    }

    // 2. COMMAND ACK ENVELOPES
    if (msgType === 'COMMAND_ACK') {
      const ack: CommandAck = message;
      commandManager.handleAck(ack);
      if (ack.state_version && ack.state_version > this.lastStateVersion) {
        this.lastStateVersion = ack.state_version;
      }
      return;
    }

    // 3. COMPLETE STATE SNAPSHOT
    if (msgType === 'STATE_SNAPSHOT') {
      this.hydrateFullSnapshot(message.payload || message);
      if (message.state_version) {
        this.lastStateVersion = message.state_version;
      }
      useCommunicationStore.getState().setConnectionState('CONNECTED');
      return;
    }

    // 4. PARTIAL SNAPSHOTS
    if (msgType === 'MISSION_SNAPSHOT') {
      useMissionStore.getState().hydrateFromSnapshot(message.payload || message);
      return;
    }
    if (msgType === 'FLEET_SNAPSHOT') {
      useFleetStore.getState().hydrateFromSnapshot(message.payload || message);
      return;
    }
    if (msgType === 'GEOFENCE_SNAPSHOT') {
      useGeofenceStore.getState().hydrateFromSnapshot(message.payload || message);
      return;
    }
    if (msgType === 'TELEMETRY_SNAPSHOT') {
      useTelemetryStore.getState().hydrateFromSnapshot(message.payload || message);
      return;
    }

    // 4b. CAMERA FRAMES (Fast-path routing to cameraStore)
    if (msgType === 'CAMERA_FRAME' || msgType === 'camera.frame' || message.topic === 'CAMERA_FRAME') {
      useCameraStore.getState().updateFrame(message.payload || message);
      return;
    }

    // 4c. SWARM TELEMETRY BATCH (All 5 UAVs in one tick)
    if (msgType === 'SWARM_TELEMETRY' || msgType === 'swarm.telemetry' || message.topic === 'SWARM_TELEMETRY') {
      const telem = (message.payload || message).telemetry;
      if (telem && typeof telem === 'object') {
        Object.entries(telem).forEach(([dId, dData]: [string, any]) => {
          useFleetStore.getState().updateDroneState(dId, {
            latitude: dData.lat,
            longitude: dData.lon,
            altitude: dData.alt,
            heading: dData.heading,
            speed: dData.speed,
            battery: dData.battery,
            flight_mode: dData.status || 'MISSION',
          });
        });
      }
      return;
    }

    // 4d. SURVIVOR ALERTS
    if (msgType === 'SURVIVOR_ALERT' || message.topic === 'SURVIVOR_ALERT') {
      const alertData = message.data || message.payload || message;
      useAlertStore.getState().addAlert({
        alert_id: alertData.id ? String(alertData.id) : `alert_${Date.now()}`,
        severity: 'CRITICAL',
        title: `Survivor Detected: ${alertData.drone_id || alertData.drone || 'Swarm'}`,
        message: `High confidence survivor (${Math.round((alertData.confidence || 0.9) * 100)}%) at (${alertData.lat?.toFixed(5)}, ${alertData.lon?.toFixed(5)})`,
        source: 'perception',
        drone_id: alertData.drone_id || alertData.drone,
      });
      return;
    }

    // 5. EVENT ENVELOPES
    const eventId = message.event_id;
    const eventType = message.event_type || message.topic || message.type;
    const stateVersion = message.state_version;
    const payload = message.payload !== undefined ? message.payload : message;

    // Determine if this is a per-drone telemetry event — these MUST bypass global
    // state version filtering. All drones in the same simulation tick share the
    // same state_version. If we filter by global version, only the first drone's
    // packet survives per tick and all followers are silently dropped (BUG 1 root cause).
    const isTelemetryEvent = TELEMETRY_EVENT_TYPES.has(eventType);

    // A. Event Deduplication Check (applies to all events)
    if (eventId) {
      if (this.processedEventIds.has(eventId)) {
        this.droppedDuplicateEventsCount++;
        return;
      }
      this.recordEventId(eventId);
      this.lastProcessedEventId = eventId;
    }

    // B. State Versioning & Gap Check
    //    SKIPPED for telemetry/position events — they use per-drone sequence numbers (section C/D).
    if (!isTelemetryEvent && typeof stateVersion === 'number' && stateVersion > 0) {
      if (this.lastStateVersion > 0 && stateVersion <= this.lastStateVersion) {
        this.droppedStaleEventsCount++;
        return;
      }

      if (this.lastStateVersion > 0 && stateVersion > this.lastStateVersion + 1) {
        this.stateGapCount++;
        wsClient.requestStateSnapshot();
      }

      this.lastStateVersion = stateVersion;
    }

    // C. Telemetry Ordering & Multi-Drone Position Synchronization
    if (eventType === 'telemetry.updated' || eventType === 'TELEMETRY_UPDATED') {
      const droneId = payload.drone_id || 'drone_alpha';
      const seqNum = payload.sequence_number;

      if (typeof seqNum === 'number') {
        const lastSeq = this.lastTelemetrySequence[droneId] || 0;
        // Drop only out-of-order packets for this specific drone
        if (lastSeq > 0 && seqNum <= lastSeq) {
          this.droppedOutOfOrderTelemCount++;
          return;
        }

        if (lastSeq > 0 && seqNum > lastSeq + 25) {
          wsClient.requestTelemetrySnapshot();
        }

        this.lastTelemetrySequence[droneId] = seqNum;
      }

      useTelemetryStore.getState().updateTelemetry(payload);

      useFleetStore.getState().updateDroneState(droneId, {
        latitude: payload.latitude,
        longitude: payload.longitude,
        altitude: payload.altitude_agl ?? payload.altitude,
        heading: payload.heading,
        speed: payload.ground_speed ?? payload.speed,
        battery: payload.battery_percent ?? payload.battery,
        flight_mode: payload.flight_mode,
        target_latitude: payload.target_position?.latitude,
        target_longitude: payload.target_position?.longitude,
        target_altitude: payload.target_position?.altitude,
      });
      return;
    }

    // D. Fleet Position Update (secondary per-drone event — also exempt from global version check)
    if (eventType === 'fleet.drone_position_updated' || eventType === 'FLEET_DRONE_POSITION_UPDATED') {
      const droneId = payload.drone_id;
      if (droneId && payload.position) {
        useFleetStore.getState().updateDroneState(droneId, {
          latitude: payload.position.latitude,
          longitude: payload.position.longitude,
          altitude: payload.position.altitude,
          heading: payload.heading,
          speed: payload.speed,
          battery: payload.battery,
          flight_mode: payload.flight_mode,
          target_latitude: payload.target_position?.latitude,
          target_longitude: payload.target_position?.longitude,
          target_altitude: payload.target_position?.altitude,
        });
      }
      return;
    }

    // E. Subsystem Event Dispatching
    this.dispatchEvent(eventType, payload);
  }

  private dispatchEvent(topic: string, payload: any): void {
    if (!topic) return;

    // Mission Events
    if (topic === 'mission.waypoint_added' && payload.waypoint) {
      useMissionStore.getState().setWaypoints([
        ...useMissionStore.getState().waypoints,
        payload.waypoint,
      ]);
    } else if (topic === 'mission.waypoint_updated' && payload.waypoint) {
      const current = useMissionStore.getState().waypoints;
      useMissionStore.getState().setWaypoints(
        current.map((w) => (w.id === payload.waypoint.id ? { ...w, ...payload.waypoint } : w))
      );
    } else if (topic === 'mission.waypoint_deleted' && payload.waypoint_id) {
      useMissionStore.getState().setWaypoints(
        useMissionStore.getState().waypoints.filter((w) => w.id !== payload.waypoint_id)
      );
    } else if (topic === 'mission.waypoints_updated' && Array.isArray(payload.waypoints)) {
      useMissionStore.getState().setWaypoints(payload.waypoints);
    } else if (topic.startsWith('mission.')) {
      useMissionStore.getState().updateFromEvent(topic, payload);
    }

    // Fleet & Swarm Events
    else if (topic.startsWith('fleet.')) {
      useFleetStore.getState().updateFromEvent(topic, payload);
    }

    // Geofence Events — route through store's updateFromEvent which handles dedup & normalization
    else if (topic.startsWith('geofence.')) {
      useGeofenceStore.getState().updateFromEvent(topic, payload);
    }


    // GIS Events
    else if (topic.startsWith('gis.')) {
      useGISStore.getState().updateFromEvent(topic, payload);
    }

    // AI Events
    else if (topic.startsWith('ai.')) {
      useAIStore.getState().updateFromEvent(topic, payload);
    }

    // Predictive Disaster Risk, Forecast & Pre-Positioning Events
    else if (topic === 'risk.updated' && payload) {
      useRiskStore.setState({ temporalMap: payload });
    } else if (topic === 'forecast.updated' && payload) {
      useRiskStore.setState({ forecast: payload });
    } else if (topic === 'prepositioning.updated' && payload.recommendations) {
      useRiskStore.setState({ recommendations: payload.recommendations });
    } else if (topic === 'risk.theater_changed' && payload) {
      if (payload.temporal_map) useRiskStore.setState({ temporalMap: payload.temporal_map });
      if (payload.zone) useRiskStore.setState({ selectedZone: payload.zone, selectedTheater: `${payload.zone.place_name} (${payload.zone.state})` });
    } else if ((topic === 'risk.disaster_zones' || topic === 'alerts.national_feed') && payload.disaster_zones) {
      useRiskStore.setState({ disasterZones: payload.disaster_zones });
    }

    // Alert Events
    else if (topic === 'alert.created' && payload.alert) {
      if (payload.alert.source !== 'geofence_monitor' && !payload.alert.title?.toLowerCase().includes('geofence')) {
        useAlertStore.getState().addAlert(payload.alert);
      }
    } else if (topic === 'alert.acknowledged' && payload.alert_id) {
      useAlertStore.getState().acknowledgeAlert(payload.alert_id);
    }
  }

  private hydrateFullSnapshot(snapshot: any): void {
    if (!snapshot) return;

    if (snapshot.mission) {
      useMissionStore.getState().hydrateFromSnapshot(snapshot.mission);
    }
    if (snapshot.fleet) {
      useFleetStore.getState().hydrateFromSnapshot(snapshot.fleet);
    }
    if (snapshot.telemetry) {
      useTelemetryStore.getState().hydrateFromSnapshot(snapshot.telemetry);
    }
    if (snapshot.geofence) {
      useGeofenceStore.getState().hydrateFromSnapshot(snapshot.geofence);
    }
    if (snapshot.gis) {
      useGISStore.getState().hydrateFromSnapshot(snapshot.gis);
    }
    if (snapshot.ai) {
      useAIStore.getState().hydrateFromSnapshot(snapshot.ai);
    }
    if (Array.isArray(snapshot.alerts)) {
      useAlertStore.getState().hydrateFromSnapshot(snapshot.alerts);
    }
    useDefensiveUpgradesStore.getState().hydrateFromSnapshot(snapshot);
  }

  private recordEventId(eventId: string): void {
    this.processedEventIds.add(eventId);
    this.eventIdQueue.push(eventId);
    if (this.eventIdQueue.length > this.maxEventCacheSize) {
      const oldest = this.eventIdQueue.shift();
      if (oldest) this.processedEventIds.delete(oldest);
    }
  }

  public getLastStateVersion(): number {
    return this.lastStateVersion;
  }

  public resetMetrics(): void {
    this.lastStateVersion = 0;
    this.lastTelemetrySequence = {};
    this.processedEventIds.clear();
    this.eventIdQueue = [];
    this.droppedStaleEventsCount = 0;
    this.droppedDuplicateEventsCount = 0;
    this.droppedOutOfOrderTelemCount = 0;
    this.stateGapCount = 0;
    this.lastProcessedEventId = null;
  }
}

export const messageRouter = new MessageRouter();
