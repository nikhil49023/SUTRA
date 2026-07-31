import { apiClient } from './apiClient';
import type { DroneAsset } from '../types';
import { INITIAL_DRONES } from '../lib/mockData';

export class DroneApi {
  static async fetchFleet(): Promise<DroneAsset[]> {
    try {
      return await apiClient.get<DroneAsset[]>('/drones');
    } catch (e) {
      return INITIAL_DRONES;
    }
  }

  static async fetchDroneById(id: string): Promise<DroneAsset> {
    try {
      return await apiClient.get<DroneAsset>(`/drones/${id}`);
    } catch (e) {
      return INITIAL_DRONES.find((d) => d.id === id) || INITIAL_DRONES[0];
    }
  }

  static async sendDroneCommand(droneId: string, command: string, params?: any): Promise<{ success: boolean; message: string }> {
    try {
      return await apiClient.post(`/drones/${droneId}/command`, { command, params });
    } catch (e) {
      return { success: true, message: `Command '${command}' dispatched to ${droneId} (Mock Executed)` };
    }
  }
}
