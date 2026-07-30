import type { IMUSensorData, RCLinkData } from './types';

export class SensorManager {
  public static getIMUData(): IMUSensorData {
    return {
      accelXG: 0.01,
      accelYG: -0.02,
      accelZG: 0.98,
      gyroXDegS: 0.1,
      gyroYDegS: -0.1,
      gyroZDegS: 0.0,
      baroAltM: 450.2,
      temperatureC: 38.5
    };
  }

  public static getRCLinkData(): RCLinkData {
    return {
      rssiPercent: 96,
      channelValues: [1500, 1500, 1500, 1500, 2000, 1000, 1500, 1500],
      isFailsafeActive: false
    };
  }
}
