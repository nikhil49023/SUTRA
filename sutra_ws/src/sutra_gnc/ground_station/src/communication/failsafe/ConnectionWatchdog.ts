import { ConnectionManager } from '../core/ConnectionManager';

export class ConnectionWatchdog {
  public static auditConnections(): void {
    const vehicles = ConnectionManager.getConnectedVehicles();
    vehicles.forEach((v) => {
      if (!v.isConnected) {
        console.warn(`[ConnectionWatchdog] Vehicle #${v.systemId} disconnected.`);
      }
    });
  }
}
