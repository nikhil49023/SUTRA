import type { MAVLinkCommand, MAVLinkCommandAck } from './types';

export class CommandQueue {
  private queue: MAVLinkCommand[] = [];
  private isProcessing: boolean = false;
  private onCommandAckHandler: ((cmd: MAVLinkCommand, ack: MAVLinkCommandAck) => void) | null = null;

  public enqueue(cmd: MAVLinkCommand) {
    if (cmd.priority === 'EMERGENCY') {
      this.queue.unshift(cmd);
    } else if (cmd.priority === 'HIGH') {
      const lastEmergencyIdx = this.queue.findLastIndex((c) => c.priority === 'EMERGENCY');
      this.queue.splice(lastEmergencyIdx + 1, 0, cmd);
    } else {
      this.queue.push(cmd);
    }

    this.processQueue();
  }

  public registerAckHandler(handler: (cmd: MAVLinkCommand, ack: MAVLinkCommandAck) => void) {
    this.onCommandAckHandler = handler;
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const currentCmd = this.queue.shift()!;

    try {
      const ack = await this.executeMAVLinkCommand(currentCmd);
      if (this.onCommandAckHandler) {
        this.onCommandAckHandler(currentCmd, ack);
      }
    } catch (e) {
      if (this.onCommandAckHandler) {
        this.onCommandAckHandler(currentCmd, {
          commandId: currentCmd.commandId || currentCmd.id,
          command: currentCmd.command,
          result: 4 // MAV_RESULT_FAILED
        });
      }
    } finally {
      this.isProcessing = false;
      this.processQueue();
    }
  }

  private executeMAVLinkCommand(cmd: MAVLinkCommand): Promise<MAVLinkCommandAck> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          commandId: cmd.commandId || cmd.id,
          command: cmd.command,
          result: 0 // MAV_RESULT_ACCEPTED
        });
      }, 150);
    });
  }

  public clearQueue() {
    this.queue = [];
  }
}
