import { GISService } from './gisService';
import type { Waypoint, DroneAsset, TelemetryData } from '../types';

export interface SimulationState {
  isRunning: boolean;
  isPaused: boolean;
  currentWaypointIndex: number;
  progressPercent: number;
  multiplier: number; // 1x, 2x, 5x, 10x
}

export class SimulationService {
  private waypoints: Waypoint[] = [];
  private state: SimulationState = {
    isRunning: false,
    isPaused: false,
    currentWaypointIndex: 0,
    progressPercent: 0,
    multiplier: 1
  };

  private animationFrameId: number | null = null;
  private lastTimestamp: number = 0;
  private currentSegmentProgress: number = 0;

  private onUpdateCallback: ((drone: Partial<DroneAsset>, telemetry: Partial<TelemetryData>, state: SimulationState) => void) | null = null;

  constructor(waypoints: Waypoint[]) {
    this.waypoints = waypoints;
  }

  public setWaypoints(waypoints: Waypoint[]) {
    this.waypoints = waypoints;
  }

  public setMultiplier(mult: number) {
    this.state.multiplier = mult;
  }

  public start(onUpdate: (drone: Partial<DroneAsset>, telemetry: Partial<TelemetryData>, state: SimulationState) => void) {
    if (this.waypoints.length < 2) return;
    this.onUpdateCallback = onUpdate;
    this.state.isRunning = true;
    this.state.isPaused = false;
    this.lastTimestamp = performance.now();
    this.loop();
  }

  public pause() {
    this.state.isPaused = true;
  }

  public resume() {
    if (this.state.isRunning && this.state.isPaused) {
      this.state.isPaused = false;
      this.lastTimestamp = performance.now();
      this.loop();
    }
  }

  public stop() {
    this.state.isRunning = false;
    this.state.isPaused = false;
    this.state.currentWaypointIndex = 0;
    this.currentSegmentProgress = 0;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private loop = () => {
    if (!this.state.isRunning || this.state.isPaused) return;

    const now = performance.now();
    const deltaSec = ((now - this.lastTimestamp) / 1000) * this.state.multiplier;
    this.lastTimestamp = now;

    if (this.state.currentWaypointIndex < this.waypoints.length - 1) {
      const currentWp = this.waypoints[this.state.currentWaypointIndex];
      const nextWp = this.waypoints[this.state.currentWaypointIndex + 1];

      // Segment distance in meters
      const segmentDistKm = GISService.calculateRouteDistance([
        [currentWp.lat, currentWp.lng],
        [nextWp.lat, nextWp.lng]
      ]);
      const segmentDistMeters = segmentDistKm * 1000;

      // Speed = 15 m/s (54 km/h)
      const speedMs = 15;
      const segmentDurationSec = segmentDistMeters / speedMs;

      if (segmentDurationSec > 0) {
        this.currentSegmentProgress += deltaSec / segmentDurationSec;
      } else {
        this.currentSegmentProgress = 1;
      }

      if (this.currentSegmentProgress >= 1) {
        this.currentSegmentProgress = 0;
        this.state.currentWaypointIndex += 1;
      }

      const activeStart = this.waypoints[this.state.currentWaypointIndex];
      const activeEnd = this.waypoints[Math.min(this.state.currentWaypointIndex + 1, this.waypoints.length - 1)];

      const currentPos = GISService.interpolatePosition(
        [activeStart.lat, activeStart.lng],
        [activeEnd.lat, activeEnd.lng],
        this.currentSegmentProgress
      );

      const heading = GISService.calculateBearing(
        [activeStart.lat, activeStart.lng],
        [activeEnd.lat, activeEnd.lng]
      );

      const currentAlt = Math.round(
        activeStart.alt + (activeEnd.alt - activeStart.alt) * this.currentSegmentProgress
      );

      const overallProgress = Math.round(
        ((this.state.currentWaypointIndex + this.currentSegmentProgress) / (this.waypoints.length - 1)) * 100
      );
      this.state.progressPercent = overallProgress;

      if (this.onUpdateCallback) {
        this.onUpdateCallback(
          {
            lat: currentPos[0],
            lng: currentPos[1],
            altitude: currentAlt,
            heading: Math.round(heading),
            groundSpeed: 54
          },
          {
            altitudeAGL: currentAlt,
            yaw: Math.round(heading),
            groundSpeed: 54
          },
          { ...this.state }
        );
      }

      this.animationFrameId = requestAnimationFrame(this.loop);
    } else {
      // Completed simulation
      this.state.isRunning = false;
      this.state.progressPercent = 100;
    }
  };
}
