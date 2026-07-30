import type { MAVLinkHeartbeat } from './types';

export type DiscoveryListener = (drones: MAVLinkHeartbeat[]) => void;

export class DroneDiscoveryService {
  private discoveredDrones: Map<number, MAVLinkHeartbeat> = new Map();
  private listeners: Set<DiscoveryListener> = new Set();
  private scanInterval: number | null = null;

  public startDiscovery() {
    // Initial mock heartbeat scan simulating PX4 and ArduPilot drones
    this.processIncomingHeartbeat({
      sysId: 1,
      compId: 1,
      autopilot: 'PX4',
      vehicleType: 'HEXAROTOR',
      baseMode: 209,
      customMode: 67108864, // PX4 AUTO MISSION
      systemStatus: 'ACTIVE',
      mavlinkVersion: 2
    });

    this.processIncomingHeartbeat({
      sysId: 2,
      compId: 1,
      autopilot: 'ARDUPILOT',
      vehicleType: 'VTOL',
      baseMode: 81,
      customMode: 4, // ARDUPILOT GUIDED
      systemStatus: 'ACTIVE',
      mavlinkVersion: 2
    });
  }

  public processIncomingHeartbeat(hb: MAVLinkHeartbeat) {
    this.discoveredDrones.set(hb.sysId, hb);
    this.notifyListeners();
  }

  public subscribe(listener: DiscoveryListener) {
    this.listeners.add(listener);
    listener(Array.from(this.discoveredDrones.values()));
  }

  public unsubscribe(listener: DiscoveryListener) {
    this.listeners.delete(listener);
  }

  private notifyListeners() {
    const list = Array.from(this.discoveredDrones.values());
    this.listeners.forEach((fn) => fn(list));
  }

  public stopDiscovery() {
    if (this.scanInterval !== null) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }
}
