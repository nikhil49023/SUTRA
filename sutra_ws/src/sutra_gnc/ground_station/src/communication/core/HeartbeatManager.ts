import type { VehicleDiscoveryInfo } from '../types';
import { ConnectionManager } from './ConnectionManager';

export class HeartbeatManager {
  private static timerId: any = null;

  public static startHeartbeatStream(): void {
    if (this.timerId) return;

    this.timerId = setInterval(() => {
      const vehicles = ConnectionManager.getConnectedVehicles();
      vehicles.forEach((v) => {
        if (v.isConnected) {
          v.lastHeartbeatTime = new Date().toISOString();
        }
      });
    }, 1000);
  }

  public static stopHeartbeatStream(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}
