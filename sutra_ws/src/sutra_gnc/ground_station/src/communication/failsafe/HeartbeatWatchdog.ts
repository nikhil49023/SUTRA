import type { WatchdogAlert } from '../types';
import { emergencyManager } from '../../engine/execution/emergencyManager';

export class HeartbeatWatchdog {
  private static timeoutSeconds: number = 3;

  /**
   * Check vehicle heartbeat freshness and trigger failsafe if timed out.
   */
  public static checkHeartbeat(sysId: number, lastHeartbeatIso: string): WatchdogAlert | null {
    const elapsedSeconds = (Date.now() - new Date(lastHeartbeatIso).getTime()) / 1000;

    if (elapsedSeconds > this.timeoutSeconds) {
      emergencyManager.triggerEmergency(
        'TELEMETRY_LOST',
        `Heartbeat timeout for system ID ${sysId}. No response for ${elapsedSeconds.toFixed(1)}s.`
      );

      return {
        id: `watchdog-${Date.now()}`,
        trigger: 'HEARTBEAT_TIMEOUT',
        systemId: sysId,
        severity: 'CRITICAL',
        message: `Heartbeat lost for Vehicle #${sysId}. Executing failsafe loiter.`,
        timestamp: new Date().toISOString()
      };
    }

    return null;
  }
}
