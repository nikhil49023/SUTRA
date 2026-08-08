import { DroneRegistry } from '../core/DroneRegistry';
import { LeaderElectionEngine } from '../communication/LeaderElection';

export class DynamicTaskReassignment {
  /**
   * Reassign tasks when a drone node experiences fault or battery emergency.
   */
  public static handleDroneLoss(lostDroneId: string): void {
    const node = DroneRegistry.getNode(lostDroneId);
    if (node) {
      node.status = 'FAULT';
      if (node.isLeader) {
        LeaderElectionEngine.electNewLeader();
      }
    }
  }
}
