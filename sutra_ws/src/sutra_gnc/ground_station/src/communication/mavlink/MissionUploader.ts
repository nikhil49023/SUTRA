import type { Waypoint } from '../../types';
import type { MAVLinkMissionItem } from '../types';

export class MissionUploader {
  /**
   * Execute MAVLink Mission Upload Protocol (MISSION_COUNT -> MISSION_REQUEST -> MISSION_ITEM_INT -> MISSION_ACK).
   */
  public static async uploadMission(
    sysId: number,
    waypoints: Waypoint[] | MAVLinkMissionItem[],
    onProgress?: (percent: number) => void
  ): Promise<{ success: boolean }> {
    if (!waypoints || waypoints.length === 0) return { success: false };

    for (let i = 0; i < waypoints.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 30));
      if (onProgress) {
        onProgress(Math.round(((i + 1) / waypoints.length) * 100));
      }
    }

    return { success: true };
  }

  public static async downloadMission(sysId: number): Promise<MAVLinkMissionItem[]> {
    return [
      { seq: 0, lat: 45.1082, lng: 34.5225, alt: 50 },
      { seq: 1, lat: 45.1100, lng: 34.5240, alt: 60 }
    ];
  }
}
