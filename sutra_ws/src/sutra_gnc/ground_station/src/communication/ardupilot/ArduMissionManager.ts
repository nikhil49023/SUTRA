import type { Waypoint } from '../../types';

export class ArduMissionManager {
  public static uploadArduMission(waypoints: Waypoint[]): Promise<boolean> {
    return Promise.resolve(true);
  }
}
