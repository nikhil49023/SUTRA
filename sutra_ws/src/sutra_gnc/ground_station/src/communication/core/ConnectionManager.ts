import type { ConnectionType, VehicleDiscoveryInfo } from '../types';
import { eventBus } from '../../services/eventBus';

type ConnectionListener = (vehicles: VehicleDiscoveryInfo[]) => void;

export class ConnectionManager {
  private static activeConnections = new Map<number, VehicleDiscoveryInfo>();
  private static listeners: Set<ConnectionListener> = new Set();
  private static currentMode: string = 'UDP_SITL';

  public static setMode(mode: string): void {
    this.currentMode = mode;
  }

  public static connectVehicle(
    systemId: number,
    connectionUrl: string = 'udp://127.0.0.1:14540',
    connectionType: ConnectionType = 'UDP_SITL'
  ): VehicleDiscoveryInfo {
    const info: VehicleDiscoveryInfo = {
      systemId,
      componentId: 1,
      vehicleType: 'QUADROUTER',
      autopilot: connectionType === 'UDP_SITL' ? 'PX4' : 'ARDUPILOT',
      firmwareVersion: 'v1.14.0 SITL',
      connectionType,
      connectionUrl,
      isConnected: true,
      lastHeartbeatTime: new Date().toISOString()
    };

    this.activeConnections.set(systemId, info);
    this.notifyListeners();

    eventBus.emit('DRONE_CONNECTED' as any, { systemId, connectionUrl });
    return info;
  }

  public static disconnectVehicle(systemId: number): void {
    const info = this.activeConnections.get(systemId);
    if (info) {
      info.isConnected = false;
      this.notifyListeners();
      eventBus.emit('DRONE_DISCONNECTED' as any, { systemId });
    }
  }

  public static getConnectedVehicles(): VehicleDiscoveryInfo[] {
    return Array.from(this.activeConnections.values());
  }

  public static subscribe(listener: ConnectionListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notifyListeners(): void {
    const list = this.getConnectedVehicles();
    this.listeners.forEach((l) => l(list));
  }
}

export const droneManager = ConnectionManager;
