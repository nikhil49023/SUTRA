import type { HardwareOperationalMode } from './types';
import { CameraStreamGateway } from './cameraGateway';
import { TelemetryRadioLink } from './telemetryRadio';
import { GimbalController } from './gimbalController';
import { SensorManager } from './sensorManager';
import { droneManager } from '../communication/mavlinkDroneManager';

export class HardwareManager {
  private static instance: HardwareManager;
  private mode: HardwareOperationalMode = 'SIMULATION';
  private cameraGateway: CameraStreamGateway = new CameraStreamGateway();
  private radioLink: TelemetryRadioLink = new TelemetryRadioLink('/dev/ttyUSB0', 57600);
  private gimbalController: GimbalController = new GimbalController();

  private constructor() {}

  public static getInstance(): HardwareManager {
    if (!HardwareManager.instance) {
      HardwareManager.instance = new HardwareManager();
    }
    return HardwareManager.instance;
  }

  public setMode(newMode: HardwareOperationalMode): void {
    this.mode = newMode;
    if (newMode === 'HARDWARE') {
      droneManager.setMode('HARDWARE_MAVLINK');
      this.radioLink.connect();
    } else {
      droneManager.setMode('LIVE_SITL');
    }
  }

  public getMode(): HardwareOperationalMode {
    return this.mode;
  }

  public getCameraGateway(): CameraStreamGateway {
    return this.cameraGateway;
  }

  public getRadioLink(): TelemetryRadioLink {
    return this.radioLink;
  }

  public getGimbalController(): GimbalController {
    return this.gimbalController;
  }

  public getSensorManager() {
    return SensorManager;
  }
}

export const hardwareManager = HardwareManager.getInstance();
