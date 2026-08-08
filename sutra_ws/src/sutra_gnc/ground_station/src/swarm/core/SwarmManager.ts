import { DroneRegistry } from './DroneRegistry';
import { swarmStateMachine } from './SwarmStateMachine';
import type { SwarmNode } from '../types';

export class SwarmManager {
  public static getNodes(): SwarmNode[] {
    return DroneRegistry.getNodes();
  }

  public static getLeaderNode(): SwarmNode | undefined {
    return this.getNodes().find((n) => n.isLeader);
  }

  public static getBackupLeaderNode(): SwarmNode | undefined {
    return this.getNodes().find((n) => n.isBackupLeader);
  }

  public static setFormationState(): void {
    swarmStateMachine.transitionTo('IN_FORMATION');
  }

  public static setMissionExecutionState(): void {
    swarmStateMachine.transitionTo('EXECUTING_MISSION');
  }
}

export const swarmManager = SwarmManager;
