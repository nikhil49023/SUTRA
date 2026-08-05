import type { DroneAsset, Waypoint, TelemetryData } from '../../types';
import { missionStateMachine } from './missionStateMachine';
import { missionTimeline } from '../reports/missionTimeline';
import { TelemetryInterpolator, type InterpolatedState } from '../execution/telemetryInterpolator';
import { WaypointNavigator } from '../execution/waypointNavigator';
import { failsafeManager } from '../execution/failsafeManager';

export type DroneUpdateCallback = (pos: Partial<DroneAsset>, telemetry: Partial<TelemetryData>) => void;

export class MissionExecutionEngine {
  private waypoints: Waypoint[] = [];
  private currentWpIndex: number = 0;
  private isSimulating: boolean = false;
  private animationFrameId: number | null = null;
  private updateCallback: DroneUpdateCallback | null = null;

  private currentLat: number = 0;
  private currentLng: number = 0;
  private currentAlt: number = 0;
  private currentHeading: number = 0;
  private currentSpeedKmh: number = 40;
  private currentBatteryPercent: number = 98;

  private navigator = new WaypointNavigator();
  private segmentProgress: number = 0;
  private lastTimestamp: number = 0;

  public setDroneUpdateCallback(cb: DroneUpdateCallback) {
    this.updateCallback = cb;
  }

  public getState() {
    return missionStateMachine.getState();
  }

  public getCurrentWaypointIndex() {
    return this.currentWpIndex;
  }

  public getWaypoints() {
    return [...this.waypoints];
  }

  /* ============================================================
     Flight Commands & Control API
     ============================================================ */

  public takeoff(drone: DroneAsset, altMeters: number = 50): void {
    missionStateMachine.transitionTo('TAKEOFF', 'Takeoff initiated');
    missionTimeline.addEvent('TAKEOFF', 'COMMAND', `Initiated takeoff to ${altMeters}m AGL.`);
    this.currentAlt = altMeters;
    this.notifyUpdate({ altitude: altMeters, status: 'IN_FLIGHT' }, { altitudeAGL: altMeters });
  }

  public startMission(drone: DroneAsset, waypoints: Waypoint[]): void {
    if (!waypoints || waypoints.length === 0) return;

    this.waypoints = waypoints;
    this.currentWpIndex = 0;
    this.segmentProgress = 0;

    this.currentLat = drone.lat;
    this.currentLng = drone.lng;
    this.currentAlt = drone.altitude || 0;
    this.currentHeading = drone.heading || 0;
    this.currentBatteryPercent = drone.battery || 98;

    missionStateMachine.transitionTo('UPLOADING', 'Uploading mission waypoints');
    missionTimeline.addEvent('UPLOADING', 'COMMAND', `Dispatched ${waypoints.length} waypoints to UAV autopilot.`);

    setTimeout(() => {
      missionStateMachine.transitionTo('ARMING', 'Arming drone motors');
      missionTimeline.addEvent('ARMING', 'COMMAND', 'Motors armed and validated.');

      setTimeout(() => {
        missionStateMachine.transitionTo('TAKEOFF', 'Initiating automatic takeoff');
        missionTimeline.addEvent('TAKEOFF', 'COMMAND', 'Automatic takeoff initiated to 50m AGL.');

        setTimeout(() => {
          missionStateMachine.transitionTo('MISSION', 'Entering active mission path');
          missionTimeline.addEvent('MISSION', 'STATE_CHANGE', 'Navigating to Waypoint #1.');
          this.start60FpsSimulation();
        }, 1500);
      }, 1200);
    }, 1000);
  }

  public pauseMission(): void {
    if (this.isSimulating) {
      this.stop60FpsSimulation();
      missionStateMachine.transitionTo('HOLD', 'Mission paused by operator');
      missionTimeline.addEvent('HOLD', 'COMMAND', 'Mission paused: UAV holding position.');
    }
  }

  public resumeMission(): void {
    if (missionStateMachine.getState() === 'HOLD') {
      missionStateMachine.transitionTo('MISSION', 'Mission resumed by operator');
      missionTimeline.addEvent('MISSION', 'COMMAND', 'Resuming waypoint navigation trajectory.');
      this.start60FpsSimulation();
    }
  }

  public returnToHome(drone: DroneAsset): void {
    this.stop60FpsSimulation();
    missionStateMachine.transitionTo('RTL', 'RTL Dispatched');
    missionTimeline.addEvent('RTL', 'COMMAND', 'Return-to-Launch command executed.');

    this.start60FpsSimulation(true);
  }

  public land(drone: DroneAsset): void {
    this.stop60FpsSimulation();
    missionStateMachine.transitionTo('LANDING', 'Landing command initiated');
    missionTimeline.addEvent('LANDING', 'COMMAND', 'Autonomous precision landing initiated.');

    let alt = this.currentAlt;
    const landInterval = setInterval(() => {
      alt -= 2.5;
      if (alt <= 0) {
        alt = 0;
        clearInterval(landInterval);
        missionStateMachine.transitionTo('COMPLETE', 'Landing complete');
        missionTimeline.addEvent('COMPLETE', 'STATE_CHANGE', 'Touchdown verified. Flight mission completed.');
      }
      this.currentAlt = alt;
      this.notifyUpdate({ altitude: alt, status: 'STANDBY' }, { altitudeAGL: alt });
    }, 200);
  }

  public abortMission(drone: DroneAsset): void {
    this.stop60FpsSimulation();
    missionStateMachine.transitionTo('ABORTED', 'Mission aborted by operator');
    missionTimeline.addEvent('ABORTED', 'WARNING', 'Mission execution aborted by ground operator.');
  }

  public reset(): void {
    this.stop60FpsSimulation();
    this.waypoints = [];
    this.currentWpIndex = 0;
    this.segmentProgress = 0;
    missionStateMachine.transitionTo('IDLE', 'Mission reset');
  }

  /* ============================================================
     60 FPS Simulation Loop & Interpolation Engine
     ============================================================ */

  private start60FpsSimulation(isRTL: boolean = false) {
    this.isSimulating = true;
    this.lastTimestamp = performance.now();

    const loop = (timestamp: number) => {
      if (!this.isSimulating) return;

      const dt = (timestamp - this.lastTimestamp) / 1000;
      this.lastTimestamp = timestamp;

      this.stepSimulation(dt, isRTL);

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  private stop60FpsSimulation() {
    this.isSimulating = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private stepSimulation(dt: number, isRTL: boolean) {
    if (this.waypoints.length === 0 && !isRTL) return;

    if (isRTL) {
      this.currentAlt = Math.max(this.currentAlt - dt * 5, 0);
      if (this.currentAlt === 0) {
        this.stop60FpsSimulation();
        missionStateMachine.transitionTo('COMPLETE', 'RTL Complete');
        missionTimeline.addEvent('COMPLETE', 'STATE_CHANGE', 'RTL procedure complete.');
        return;
      }
      this.notifyUpdate({ altitude: this.currentAlt }, { altitudeAGL: this.currentAlt });
      return;
    }

    const currentWp = this.waypoints[this.currentWpIndex];
    const nextWp = this.waypoints[Math.min(this.currentWpIndex + 1, this.waypoints.length - 1)];

    const fromState = {
      lat: this.currentLat,
      lng: this.currentLng,
      alt: this.currentAlt,
      heading: this.currentHeading
    };

    const toState = {
      lat: nextWp.lat,
      lng: nextWp.lng,
      alt: nextWp.alt,
      heading: currentWp ? Math.round((Math.atan2(nextWp.lng - currentWp.lng, nextWp.lat - currentWp.lat) * 180) / Math.PI + 360) % 360 : 0
    };

    this.segmentProgress += dt * 0.25;

    if (this.segmentProgress >= 1.0) {
      this.segmentProgress = 0;
      this.currentWpIndex++;

      missionTimeline.addEvent('MISSION', 'CHECKPOINT', `Reached Waypoint #${this.currentWpIndex + 1}.`);

      if (this.currentWpIndex >= this.waypoints.length - 1) {
        this.stop60FpsSimulation();
        this.land({ lat: this.currentLat, lng: this.currentLng } as any);
        return;
      }
    }

    const interp: InterpolatedState = TelemetryInterpolator.interpolate(
      fromState,
      toState,
      this.segmentProgress,
      this.currentSpeedKmh
    );

    this.currentLat = interp.lat;
    this.currentLng = interp.lng;
    this.currentAlt = interp.alt;
    this.currentHeading = interp.heading;

    this.currentBatteryPercent = Math.max(this.currentBatteryPercent - dt * 0.05, 5);

    const droneUpdate: Partial<DroneAsset> = {
      lat: interp.lat,
      lng: interp.lng,
      altitude: interp.alt,
      heading: interp.heading,
      groundSpeed: interp.groundSpeed,
      battery: Math.round(this.currentBatteryPercent),
      status: 'IN_FLIGHT'
    };

    const telemetryUpdate: Partial<TelemetryData> = {
      altitudeAGL: interp.alt,
      altitudeMSL: interp.alt + 350,
      groundSpeed: interp.groundSpeed,
      pitch: interp.pitch,
      roll: interp.roll,
      yaw: interp.heading,
      batteryRemaining: Math.round(this.currentBatteryPercent),
      satellites: 18,
      linkLatencyMs: 25
    };

    failsafeManager.evaluateTelemetry(telemetryUpdate as TelemetryData);

    this.notifyUpdate(droneUpdate, telemetryUpdate);
  }

  private notifyUpdate(drone: Partial<DroneAsset>, tel: Partial<TelemetryData>) {
    if (this.updateCallback) {
      this.updateCallback(drone, tel);
    }
  }
}

export const missionExecutionEngine = new MissionExecutionEngine();
