import type { IDroneAdapter, MAVLinkCommand, MAVLinkCommandAck, MAVParam, MAVLinkMissionItem } from './types';
import { CommandQueue } from './commandQueue';
import { MissionTransferManager } from './missionTransferManager';
import { ParameterManager } from './parameterManager';

export class SimulatedDroneAdapter implements IDroneAdapter {
  private sysId: number;
  private isConnected: boolean = false;
  private commandQueue: CommandQueue = new CommandQueue();
  private parameterManager: ParameterManager = new ParameterManager();
  private heartbeatTimer: number | null = null;

  constructor(sysId: number = 1) {
    this.sysId = sysId;
  }

  public async connect(): Promise<boolean> {
    this.isConnected = true;
    this.sendHeartbeat();
    return true;
  }

  public async disconnect(): Promise<void> {
    this.isConnected = false;
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  public sendHeartbeat(): void {
    if (this.heartbeatTimer !== null) return;
    this.heartbeatTimer = window.setInterval(() => {
      if (this.isConnected) {
        // Emit simulated heartbeat
      }
    }, 1000);
  }

  public async sendCommand(cmd: MAVLinkCommand): Promise<MAVLinkCommandAck> {
    return new Promise((resolve) => {
      this.commandQueue.registerAckHandler((sentCmd, ack) => {
        if ((sentCmd.id || sentCmd.commandId) === (cmd.id || cmd.commandId)) {
          resolve(ack);
        }
      });
      this.commandQueue.enqueue(cmd);
    });
  }

  public async uploadMission(waypoints: any[]): Promise<boolean> {
    const mavItems: MAVLinkMissionItem[] = waypoints.map((w, idx) => ({
      seq: idx,
      frame: 3,
      command: w.action === 'TAKEOFF' ? 22 : w.action === 'RTH & LAND' ? 20 : 16,
      current: idx === 0 ? 1 : 0,
      autocontinue: 1,
      param1: 0,
      param2: 0,
      param3: 0,
      param4: 0,
      x: w.lat,
      y: w.lng,
      z: w.alt,
      lat: w.lat,
      lng: w.lng,
      alt: w.alt
    }));

    const result = await MissionTransferManager.uploadMission(this.sysId, mavItems);
    return result.success;
  }

  public async downloadMission(): Promise<any[]> {
    const mavItems = await MissionTransferManager.downloadMission(this.sysId);
    return mavItems.map((item: MAVLinkMissionItem) => ({
      id: item.seq + 1,
      lat: item.lat || item.x || 0,
      lng: item.lng || item.y || 0,
      alt: item.alt || item.z || 0,
      action: item.command === 22 ? 'TAKEOFF' : item.command === 20 ? 'RTH & LAND' : 'WAYPOINT',
      completed: false
    }));
  }

  public async fetchParameters(): Promise<MAVParam[]> {
    const params = await this.parameterManager.requestParameterList();
    return params.map((p) => ({ name: p.name, value: p.value }));
  }

  public async setParameter(paramId: string, value: number): Promise<boolean> {
    return await this.parameterManager.setParameter(paramId, value);
  }
}
