import type { Waypoint } from '../../types';
import { TaskAllocator } from '../coordination/TaskAllocator';

export class MultiMissionPlanner {
  public static planCooperativeSearch(waypoints: Waypoint[]) {
    return waypoints.map((w, idx) => {
      const allocation = TaskAllocator.allocateTask(`wp-task-${w.id}`, w.lat, w.lng);
      return {
        waypoint: w,
        assignedDroneId: allocation.assignedDroneId
      };
    });
  }
}
