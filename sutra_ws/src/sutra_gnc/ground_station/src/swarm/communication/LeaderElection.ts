import { DroneRegistry } from '../core/DroneRegistry';
import type { SwarmNode } from '../types';

export class LeaderElectionEngine {
  /**
   * Automatic Leader Reassignment when primary leader is compromised or disconnected.
   */
  public static electNewLeader(): { newLeader: SwarmNode; backupLeader: SwarmNode } | null {
    const nodes = DroneRegistry.getNodes().filter((n) => n.status !== 'FAULT' && n.status !== 'RTL');

    if (nodes.length === 0) return null;

    // Highest battery + signal score node becomes leader
    nodes.sort((a, b) => (b.batteryPercent + b.signalQualityPercent) - (a.batteryPercent + a.signalQualityPercent));

    nodes.forEach((n, idx) => {
      n.isLeader = idx === 0;
      n.isBackupLeader = idx === 1;
    });

    return {
      newLeader: nodes[0],
      backupLeader: nodes[1] || nodes[0]
    };
  }
}
