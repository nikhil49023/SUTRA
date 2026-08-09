import type { IDroneAdapter, MAVLinkCommand, MAVLinkCommandAck, MAVParam } from './types';

export class MAVSDKGatewayAdapter implements IDroneAdapter {
  private grpcEndpoint: string;
  private isConnected: boolean = false;

  constructor(grpcEndpoint: string = 'http://localhost:50051') {
    this.grpcEndpoint = grpcEndpoint;
  }

  public async connect(): Promise<boolean> {
    this.isConnected = true;
    return true;
  }

  public async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  public sendHeartbeat(): void {}

  public async sendCommand(cmd: MAVLinkCommand): Promise<MAVLinkCommandAck> {
    return { commandId: cmd.commandId, result: 'ACCEPTED' };
  }

  public async uploadMission(waypoints: any[]): Promise<boolean> {
    return true;
  }

  public async downloadMission(): Promise<any[]> {
    return [];
  }

  public async fetchParameters(): Promise<MAVParam[]> {
    return [];
  }

  public async setParameter(paramId: string, value: number): Promise<boolean> {
    return true;
  }
}
