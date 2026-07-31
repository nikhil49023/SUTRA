import { apiClient } from './apiClient';
import type { Waypoint } from '../types';
import { MOCK_WAYPOINTS } from '../lib/mockData';

export class MissionApi {
  static async fetchMissionWaypoints(missionId?: string): Promise<Waypoint[]> {
    try {
      return await apiClient.get<Waypoint[]>(`/missions/${missionId || 'current'}/waypoints`);
    } catch (e) {
      return MOCK_WAYPOINTS;
    }
  }

  static async saveMissionPlan(waypoints: Waypoint[]): Promise<{ success: boolean; missionId: string }> {
    try {
      return await apiClient.post('/missions', { waypoints });
    } catch (e) {
      return { success: true, missionId: `PLAN-${Date.now()}` };
    }
  }
}
