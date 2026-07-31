import type { IDroneAdapter, MAVLinkCommand, MAVLinkCommandAck, MAVParam } from './types';
import { MAVLinkParser } from './mavlinkParser';
import { ParameterManager } from './parameterManager';

export class PX4AutopilotAdapter implements IDroneAdapter {
  private sysId: number;
  private endpoint: string; // UDP 14540
  private isConnected: boolean = false;
  private paramManager: ParameterManager = new ParameterManager();

  constructor(sysId: number = 1, endpoint: string = 'udp://127.0.0.1:14540') {
    this.sysId = sysId;
    this.endpoint = endpoint;
  }

  public async connect(): Promise<boolean> {
    this.isConnected = true;
    return true;
  }

  public async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  public sendHeartbeat(): void {
    const frame = MAVLinkParser.encodeFrame(this.sysId, 1, 0, {
      autopilot: 'PX4',
      vehicleType: 'HEXAROTOR',
      customMode: 67108864 // PX4 AUTO MISSION
    });
  }

  public async sendMAVCommand(cmd: MAVLinkCommand): Promise<MAVLinkCommandAck> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ commandId: cmd.commandId, result: 'ACCEPTED' });
      }, 100);
    });
  }

  public async sendCommand(cmd: MAVLinkCommand): Promise<MAVLinkCommandAck> {
    return this.sendMAVCommand(cmd);
  }

  public async uploadMission(waypoints: any[]): Promise<boolean> {
    return true;
  }

  public async downloadMission(): Promise<any[]> {
    return [];
  }

  public async fetchParameters(): Promise<MAVParam[]> {
    return await this.paramManager.requestParameterList();
  }

  public async setParameter(paramId: string, value: number): Promise<boolean> {
    return await this.paramManager.setParameter(paramId, value);
  }

  public static mapPX4Mode(customMode: number): string {
    switch (customMode) {
      case 67108864: return 'PX4_AUTO_MISSION';
      case 33554432: return 'PX4_AUTO_RTL';
      case 16777216: return 'PX4_AUTO_LOITER';
      case 1: return 'PX4_MANUAL';
      case 2: return 'PX4_ALTCTL';
      case 3: return 'PX4_POSCTL';
      default: return 'PX4_AUTO_MISSION';
    }
  }
}
