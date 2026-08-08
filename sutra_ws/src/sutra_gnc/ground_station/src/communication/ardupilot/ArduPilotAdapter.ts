import type { DroneAsset } from '../../types';

export class ArduPilotAdapter {
  public static setMode(drone: DroneAsset, mode: 'GUIDED' | 'AUTO' | 'RTL' | 'LOITER'): void {
    console.log(`[ArduPilotAdapter] Mode change to ${mode} for drone ${drone.id}`);
  }
}
