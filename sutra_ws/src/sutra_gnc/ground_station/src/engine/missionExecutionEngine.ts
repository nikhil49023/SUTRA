import type { Waypoint, DroneAsset } from '../types';
import { GISService } from '../services/gisService';
import { eventBus } from '../services/eventBus';

export type MissionExecutionState = 'IDLE' | 'RUNNING' | 'PAUSED' | 'ABORTED' | 'COMPLETED';

export class MissionExecutionEngine {
  private static instance: MissionExecutionEngine;
  private state: MissionExecutionState = 'IDLE';
  private waypoints: Waypoint[] = [];
  private currentWaypointIdx: number = 0;
  private animFrameId: number | null = null;
  private lastTimestampMs: number = 0;
  private cruiseSpeedKmh: number = 54; // 15 m/s

  // Position & Attitude Telemetry State
  private currentPos = { lat: 34.5011, lng: 45.0920, alt: 0, heading: 0, speedKmh: 0 };
  private updateDronePosCallback: ((pos: Partial<DroneAsset>) => void) | null = null;

  private constructor() {}

  public static getInstance(): MissionExecutionEngine {
    if (!MissionExecutionEngine.instance) {
      MissionExecutionEngine.instance = new MissionExecutionEngine();
    }
    return MissionExecutionEngine.instance;
  }

  public setDroneUpdateCallback(cb: (pos: Partial<DroneAsset>) => void): void {
    this.updateDronePosCallback = cb;
  }

  public loadMission(waypoints: Waypoint[]): void {
    this.stop();
    this.waypoints = waypoints;
    this.currentWaypointIdx = 0;
    if (waypoints.length > 0) {
      this.currentPos = {
        lat: waypoints[0].lat,
        lng: waypoints[0].lng,
        alt: waypoints[0].alt || 0,
        heading: 0,
        speedKmh: 0
      };
    }
    this.state = 'IDLE';
  }

  public start(): void {
    if (this.waypoints.length < 2) return;
    this.state = 'RUNNING';
    this.currentWaypointIdx = 0;
    this.lastTimestampMs = performance.now();
    this.loop();

    eventBus.emit('SYSTEM_ALERT', {
      title: 'MISSION EXECUTION STARTED',
      message: `Executing ${this.waypoints.length} waypoints smoothly at 60 FPS.`
    });
  }

  public pause(): void {
    this.state = 'PAUSED';
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.currentPos.speedKmh = 0;
    this.publishTelemetry();
  }

  public resume(): void {
    if (this.state === 'PAUSED') {
      this.state = 'RUNNING';
      this.lastTimestampMs = performance.now();
      this.loop();
    }
  }

  public abort(): void {
    this.state = 'ABORTED';
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.currentPos.speedKmh = 0;
    this.publishTelemetry();

    eventBus.emit('SYSTEM_ALERT', {
      title: 'MISSION ABORTED',
      message: 'Mission execution aborted by operator. Drone loitering in place.'
    });
  }

  public stop(): void {
    this.state = 'IDLE';
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private loop = (): void => {
    if (this.state !== 'RUNNING') return;

    const now = performance.now();
    const dtSec = Math.min(0.1, (now - this.lastTimestampMs) / 1000);
    this.lastTimestampMs = now;

    this.updatePosition(dtSec);
    this.publishTelemetry();

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private updatePosition(dtSec: number): void {
    if (this.currentWaypointIdx >= this.waypoints.length - 1) {
      this.state = 'COMPLETED';
      this.currentPos.speedKmh = 0;
      eventBus.emit('SYSTEM_ALERT', {
        title: 'MISSION COMPLETED',
        message: 'All waypoints reached. Flight completed successfully.'
      });
      return;
    }

    const currWp = this.waypoints[this.currentWaypointIdx];
    const nextWp = this.waypoints[this.currentWaypointIdx + 1];

    // Distance to next waypoint in meters
    const distToTargetM = GISService.calculateRouteDistance([
      [this.currentPos.lat, this.currentPos.lng],
      [nextWp.lat, nextWp.lng]
    ]) * 1000;

    // Check if waypoint reached (within 2 meters)
    if (distToTargetM < 2.0) {
      eventBus.emit('WAYPOINT_REACHED', {
        waypointId: nextWp.id,
        lat: nextWp.lat,
        lng: nextWp.lng,
        alt: nextWp.alt
      });

      this.currentWaypointIdx++;
      if (this.currentWaypointIdx >= this.waypoints.length - 1) {
        this.state = 'COMPLETED';
        return;
      }
    }

    // Geodesic bearing to target
    const bearingDeg = GISService.calculateBearing(
      [this.currentPos.lat, this.currentPos.lng],
      [nextWp.lat, nextWp.lng]
    );

    this.currentPos.heading = Math.round(bearingDeg);
    this.currentPos.speedKmh = this.cruiseSpeedKmh;

    // Distance step (speed in m/s * dtSec)
    const speedMs = (this.cruiseSpeedKmh * 1000) / 3600;
    const stepDistM = speedMs * dtSec;

    // Advance Lat/Lng position
    const bearingRad = (bearingDeg * Math.PI) / 180;
    const R_earth = 6371000; // Earth radius in meters

    const dLat = (stepDistM * Math.cos(bearingRad)) / R_earth;
    const dLng = (stepDistM * Math.sin(bearingRad)) / (R_earth * Math.cos((this.currentPos.lat * Math.PI) / 180));

    this.currentPos.lat += (dLat * 180) / Math.PI;
    this.currentPos.lng += (dLng * 180) / Math.PI;

    // Altitude linear ramp
    if (Math.abs(this.currentPos.alt - nextWp.alt) > 0.5) {
      const altStep = (nextWp.alt > this.currentPos.alt ? 5.0 : -5.0) * dtSec;
      this.currentPos.alt = Math.round(this.currentPos.alt + altStep);
    }
  }

  private publishTelemetry(): void {
    // 1. Update active drone state callback (for GIS Map marker rotation & position)
    if (this.updateDronePosCallback) {
      this.updateDronePosCallback({
        lat: this.currentPos.lat,
        lng: this.currentPos.lng,
        altitude: this.currentPos.alt,
        heading: this.currentPos.heading,
        groundSpeed: this.currentPos.speedKmh,
        status: this.state === 'RUNNING' ? 'IN_FLIGHT' : this.state === 'PAUSED' ? 'STANDBY' : 'IN_FLIGHT'
      });
    }
  }

  public getState(): MissionExecutionState {
    return this.state;
  }

  public getCurrentWaypointIndex(): number {
    return this.currentWaypointIdx;
  }
}

export const missionExecutionEngine = MissionExecutionEngine.getInstance();
