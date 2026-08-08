import type { Waypoint } from '../../types';
import { DroneRegistry } from './DroneRegistry';
import { swarmStateMachine } from './SwarmStateMachine';

export class SwarmMissionEngine {
  public static dispatchSwarmMission(waypoints: Waypoint[]): boolean {
    if (!waypoints || waypoints.length === 0) return false;
    swarmStateMachine.transitionTo('EXECUTING_MISSION');
    return true;
  }
}
