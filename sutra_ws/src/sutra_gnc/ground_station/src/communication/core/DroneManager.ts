import type { VehicleDiscoveryInfo } from '../types';
import { ConnectionManager } from './ConnectionManager';

export class DroneManager {
  /**
   * Automatic drone discovery for PX4 SITL, ArduPilot SITL, and MAVLink physical drones.
   */
  public static discoverDrones(): VehicleDiscoveryInfo[] {
    const sitl1 = ConnectionManager.connectVehicle(1, 'udp://127.0.0.1:14540', 'UDP_SITL');
    const sitl2 = ConnectionManager.connectVehicle(2, 'udp://127.0.0.1:14541', 'UDP_SITL');

    return [sitl1, sitl2];
  }

  public static getDiscoveredDrones(): VehicleDiscoveryInfo[] {
    return ConnectionManager.getConnectedVehicles();
  }
}
