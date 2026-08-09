import type { IDroneAdapter, MAVLinkCommand, MAVLinkCommandAck, MAVParam } from './types';
import { MAVLinkParser } from './mavlinkParser';
import { ParameterManager } from './parameterManager';

export class ArduPilotAdapter implements IDroneAdapter {
  private sysId: number;
  private endpoint: string; // UDP 14550 / TCP 5760
  private isConnected: boolean = false;
  private paramManager: ParameterManager = new ParameterManager();

  constructor(sysId: number = 2, endpoint: string = 'udp://127.0.0.1:14550') {
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
      autopilot: 'ARDUPILOT',
      vehicleType: 'VTOL',
      customMode: 4 // ARDUPILOT GUIDED
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

  public static mapArduPilotMode(customMode: number): string {
    switch (customMode) {
      case 0: return 'STABILIZE';
      case 2: return 'ALT_HOLD';
      case 3: return 'AUTO';
      case 4: return 'GUIDED';
      case 5: return 'LOITER';
      case 6: return 'RTL';
      default: return 'GUIDED';
    }
  }
}
