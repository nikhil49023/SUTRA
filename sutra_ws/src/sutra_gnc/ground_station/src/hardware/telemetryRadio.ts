import type { RadioLinkStats } from './types';

export class TelemetryRadioLink {
  private isConnected: boolean = false;
  private port: string;
  private baudRate: number;

  constructor(port: string = '/dev/ttyUSB0', baudRate: number = 57600) {
    this.port = port;
    this.baudRate = baudRate;
  }

  public async connect(): Promise<boolean> {
    this.isConnected = true;
    return true;
  }

  public async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  public getRadioStats(): RadioLinkStats {
    return {
      devicePort: this.port,
      baudRate: this.baudRate,
      rssiDbm: -62,
      noiseDbm: -98,
      txErrors: 0,
      rxErrors: 0,
      linkQualityPercent: 98
    };
  }
}
