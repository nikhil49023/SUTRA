import type { Waypoint } from '../../types';

export class PX4MissionManager {
  public static uploadPX4Mission(waypoints: Waypoint[]): Promise<boolean> {
    return Promise.resolve(true);
  }
}
