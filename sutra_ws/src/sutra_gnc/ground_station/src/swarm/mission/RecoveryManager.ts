import { DynamicTaskReassignment } from './DynamicTaskReassignment';
import { swarmStateMachine } from '../core/SwarmStateMachine';

export class SwarmRecoveryManager {
  public static recoverNode(droneId: string): void {
    DynamicTaskReassignment.handleDroneLoss(droneId);
    swarmStateMachine.transitionTo('RECOVERY');
  }
}
