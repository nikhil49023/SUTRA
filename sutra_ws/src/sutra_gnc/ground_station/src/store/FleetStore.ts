import { useState, useEffect } from 'react';
import type { DroneAsset } from '../types';
import type { FormationType, FormationConfig, FormationTarget } from '../swarm/FormationTypes';
import { formationEngine } from '../swarm/FormationEngine';

type FleetListener = () => void;

class FleetStore {
  private drones: DroneAsset[] = [
    {
      id: 'DRONE_01',
      callsign: 'Alpha Leader',
      model: 'HEXAROTOR',
      status: 'IN_FLIGHT',
      battery: 95,
      lat: 45.1082,
      lng: 34.5225,
      altitude: 100,
      heading: 45,
      groundSpeed: 40,
      signalStrength: 98,
      payload: '4K EO / IR',
      mission: 'RECON_ALPHA',
      satellites: 18,
      flightTime: '00:14:22'
    },
    {
      id: 'DRONE_02',
      callsign: 'Bravo Wingman',
      model: 'QUADROUTER',
      status: 'IN_FLIGHT',
      battery: 91,
      lat: 45.1090,
      lng: 34.5235,
      altitude: 100,
      heading: 45,
      groundSpeed: 40,
      signalStrength: 95,
      payload: 'Thermal IR',
      mission: 'RECON_ALPHA',
      satellites: 18,
      flightTime: '00:14:22'
    },
    {
      id: 'DRONE_03',
      callsign: 'Charlie Scout',
      model: 'FIXED_WING',
      status: 'IN_FLIGHT',
      battery: 88,
      lat: 45.1075,
      lng: 34.5215,
      altitude: 100,
      heading: 45,
      groundSpeed: 40,
      signalStrength: 92,
      payload: 'LiDAR Terrain',
      mission: 'RECON_ALPHA',
      satellites: 18,
      flightTime: '00:14:22'
    }
  ];

  private selectedDroneId: string = 'DRONE_01';
  private listeners: Set<FleetListener> = new Set();

  public getDrones(): DroneAsset[] {
    return [...this.drones];
  }

  public getSelectedDrone(): DroneAsset {
    return this.drones.find((d) => d.id === this.selectedDroneId) || this.drones[0];
  }

  public getLeaderDrone(): DroneAsset {
    const config = formationEngine.getConfig();
    return this.drones.find((d) => d.id === config.leaderId) || this.drones[0];
  }

  public getFormationConfig(): FormationConfig {
    return formationEngine.getConfig();
  }

  public setFormation(type: FormationType): void {
    formationEngine.setFormation(type);
    this.notify();
  }

  public setSpacing(spacingMeters: number): void {
    formationEngine.setSpacing(spacingMeters);
    this.notify();
  }

  public setLeader(leaderId: string): void {
    formationEngine.setLeader(leaderId);
    this.notify();
  }

  public selectDrone(id: string): void {
    this.selectedDroneId = id;
    this.notify();
  }

  public updateDronePosition(droneId: string, pos: Partial<DroneAsset>): void {
    const drone = this.drones.find((d) => d.id === droneId);
    if (drone) {
      Object.assign(drone, pos);

      // If leader position moved, continuously update formation follower positions
      const config = formationEngine.getConfig();
      if (droneId === config.leaderId && (pos.lat !== undefined || pos.lng !== undefined)) {
        formationEngine.updateLeaderPosition({
          lat: drone.lat,
          lng: drone.lng,
          alt: drone.altitude || 50,
          heading: drone.heading || 0
        });
      }

      this.notify();
    }
  }

  public subscribe(listener: FleetListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }
}

export const fleetStore = new FleetStore();

export function useFleetStore() {
  const [, setTick] = useState(0);
  useEffect(() => {
    return fleetStore.subscribe(() => setTick((t) => t + 1));
  }, []);

  return {
    drones: fleetStore.getDrones(),
    selectedDrone: fleetStore.getSelectedDrone(),
    leaderDrone: fleetStore.getLeaderDrone(),
    formationConfig: fleetStore.getFormationConfig(),
    setFormation: fleetStore.setFormation.bind(fleetStore),
    setSpacing: fleetStore.setSpacing.bind(fleetStore),
    setLeader: fleetStore.setLeader.bind(fleetStore),
    selectDrone: fleetStore.selectDrone.bind(fleetStore),
    updateDronePosition: fleetStore.updateDronePosition.bind(fleetStore)
  };
}
