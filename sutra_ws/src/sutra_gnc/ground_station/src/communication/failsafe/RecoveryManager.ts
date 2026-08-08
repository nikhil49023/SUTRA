import { emergencyManager } from '../../engine/execution/emergencyManager';

export class RecoveryManager {
  public static initiateRecovery(sysId: number, reason: string): void {
    emergencyManager.triggerEmergency('TELEMETRY_LOST', `Auto recovery initiated for SysID ${sysId}: ${reason}`);
  }
}
