import type { GimbalTelemetry } from './types';

export class GimbalController {
  private pitch: number = -45.0;
  private roll: number = 0.0;
  private yaw: number = 0.0;
  private mode: GimbalTelemetry['mode'] = 'TARGET_LOCK';

  public setAngles(pitchDeg: number, yawDeg: number): void {
    this.pitch = pitchDeg;
    this.yaw = yawDeg;
  }

  public getTelemetry(): GimbalTelemetry {
    return {
      pitchDeg: this.pitch,
      rollDeg: this.roll,
      yawDeg: this.yaw,
      mode: this.mode
    };
  }
}
