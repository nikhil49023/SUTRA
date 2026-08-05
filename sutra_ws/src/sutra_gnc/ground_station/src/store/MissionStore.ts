import { useState, useEffect } from 'react';
import type { Waypoint } from '../types';
import { MissionService, type MissionEstimates } from '../services/missionService';
import { missionExecutionEngine } from '../engine/missionExecutionEngine';
import { missionTimeline } from '../engine/reports/missionTimeline';

type MissionListener = () => void;

class MissionStore {
  private waypoints: Waypoint[] = [
    { id: 1, lat: 45.1082, lng: 34.5225, alt: 50, action: 'TAKEOFF', completed: true },
    { id: 2, lat: 45.1100, lng: 34.5240, alt: 60, action: 'WAYPOINT', completed: false },
    { id: 3, lat: 45.1120, lng: 34.5260, alt: 75, action: 'SEARCH_GRID', completed: false },
    { id: 4, lat: 45.1082, lng: 34.5225, alt: 50, action: 'RTH & LAND', completed: false }
  ];
  private currentWpIndex: number = 0;
  private missionState: string = 'IDLE';
  private listeners: Set<MissionListener> = new Set();

  public getWaypoints(): Waypoint[] {
    return [...this.waypoints];
  }

  public setWaypoints(newWps: Waypoint[]): void {
    this.waypoints = newWps;
    // Notify execution engine immediately of the updated route!
    missionExecutionEngine.updateWaypoints(newWps);
    this.notify();
  }

  public addWaypoint(wp: Omit<Waypoint, 'id'>): void {
    const newWp: Waypoint = {
      ...wp,
      id: this.waypoints.length + 1
    };
    this.setWaypoints([...this.waypoints, newWp]);
  }

  public removeWaypoint(id: number): void {
    this.setWaypoints(this.waypoints.filter((w) => w.id !== id));
  }

  public getEstimates(): MissionEstimates {
    return MissionService.calculateMissionEstimates(this.waypoints);
  }

  public getTimelineEvents() {
    return missionTimeline.getEvents();
  }

  public subscribe(listener: MissionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }
}

export const missionStore = new MissionStore();

export function useMissionStore() {
  const [, setTick] = useState(0);
  useEffect(() => {
    return missionStore.subscribe(() => setTick((t) => t + 1));
  }, []);

  return {
    waypoints: missionStore.getWaypoints(),
    setWaypoints: missionStore.setWaypoints.bind(missionStore),
    addWaypoint: missionStore.addWaypoint.bind(missionStore),
    removeWaypoint: missionStore.removeWaypoint.bind(missionStore),
    estimates: missionStore.getEstimates(),
    timelineEvents: missionStore.getTimelineEvents()
  };
}
