import type { TaskAllocationResult } from '../types';
import { DroneRegistry } from '../core/DroneRegistry';

export class TaskAllocator {
  /**
   * Automatically allocate a mission task to the optimal swarm node.
   */
  public static allocateTask(
    taskId: string,
    targetLat: number,
    targetLng: number,
    requiredPayload?: string
  ): TaskAllocationResult {
    const nodes = DroneRegistry.getNodes().filter((n) => n.status !== 'FAULT' && n.status !== 'RTL');

    if (nodes.length === 0) {
      return {
        taskId,
        assignedDroneId: 'NONE',
        suitabilityScore: 0,
        reason: 'No operational swarm nodes available.'
      };
    }

    let bestNode = nodes[0];
    let highestScore = -Infinity;

    nodes.forEach((n) => {
      const dist = Math.sqrt(Math.pow((n.lat - targetLat) * 111320, 2) + Math.pow((n.lng - targetLng) * 111320, 2));
      const distScore = Math.max(0, 100 - dist / 50);
      const batteryScore = n.batteryPercent;
      const payloadScore = requiredPayload && n.payloadType.includes(requiredPayload) ? 20 : 0;

      const totalScore = distScore * 0.4 + batteryScore * 0.4 + payloadScore * 0.2;

      if (totalScore > highestScore) {
        highestScore = totalScore;
        bestNode = n;
      }
    });

    return {
      taskId,
      assignedDroneId: bestNode.droneId,
      suitabilityScore: Math.round(highestScore),
      reason: `Selected ${bestNode.callsign} based on battery (${bestNode.batteryPercent}%) and distance.`
    };
  }
}
