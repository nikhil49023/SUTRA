import type { Waypoint } from '../../types';

export class PatternRecognition {
  public static detectPatternType(waypoints: Waypoint[]): string {
    if (!waypoints || waypoints.length < 3) return 'LINEAR_ROUTE';
    if (waypoints.length > 10) return 'GRID_SURVEY';
    return 'MULTI_POINT_CORRIDOR';
  }
}
