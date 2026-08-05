import type { NetworkPacket } from './ConnectionState';
import { SubscriptionManager } from './SubscriptionManager';

export class MessageDispatcher {
  private subscriptionManager: SubscriptionManager;
  private priorityQueue: NetworkPacket[] = [];
  private emergencyQueue: NetworkPacket[] = [];

  constructor(subscriptionManager: SubscriptionManager) {
    this.subscriptionManager = subscriptionManager;
  }

  public dispatch(packet: NetworkPacket): void {
    if (packet.header.topic === 'EMERGENCY' || packet.header.topic === 'FAILSFE') {
      this.emergencyQueue.push(packet);
      this.processEmergencyQueue();
      return;
    }

    if (packet.header.topic.startsWith('COMMAND') || packet.header.topic.startsWith('MISSION')) {
      this.priorityQueue.push(packet);
      this.processPriorityQueue();
      return;
    }

    // Normal stream dispatch
    this.subscriptionManager.publish(packet.header.topic, packet.payload);
  }

  private processEmergencyQueue(): void {
    while (this.emergencyQueue.length > 0) {
      const packet = this.emergencyQueue.shift()!;
      this.subscriptionManager.publish(packet.header.topic, packet.payload);
    }
  }

  private processPriorityQueue(): void {
    while (this.priorityQueue.length > 0) {
      const packet = this.priorityQueue.shift()!;
      this.subscriptionManager.publish(packet.header.topic, packet.payload);
    }
  }
}
