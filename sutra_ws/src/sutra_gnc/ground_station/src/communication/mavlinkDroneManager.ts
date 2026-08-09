import type { IDroneAdapter, MAVLinkHeartbeat } from './types';
import { PX4AutopilotAdapter } from './px4Adapter';
import { ArduPilotAdapter } from './arduPilotAdapter';
import { SimulatedDroneAdapter } from './simulatedDroneAdapter';
import { DroneDiscoveryService } from './droneDiscovery';

export type CommunicationMode = 'LIVE_SITL' | 'HARDWARE_MAVLINK' | 'MOCK';

export class MAVLinkDroneManager {
  private static instance: MAVLinkDroneManager;
  private mode: CommunicationMode = 'LIVE_SITL';
  private adapters: Map<number, IDroneAdapter> = new Map();
  private discoveryService: DroneDiscoveryService = new DroneDiscoveryService();
  private isAutoReconnectEnabled: boolean = true;

  private constructor() {
    this.initAdapters();
  }

  public static getInstance(): MAVLinkDroneManager {
    if (!MAVLinkDroneManager.instance) {
      MAVLinkDroneManager.instance = new MAVLinkDroneManager();
    }
    return MAVLinkDroneManager.instance;
  }

  private initAdapters() {
    // Registered adapters for sysId 1 (PX4) and sysId 2 (ArduPilot)
    this.adapters.set(1, new PX4AutopilotAdapter(1, 'udp://127.0.0.1:14540'));
    this.adapters.set(2, new ArduPilotAdapter(2, 'udp://127.0.0.1:14550'));
    
    // Fallback Mock Adapter
    this.adapters.set(99, new SimulatedDroneAdapter(99));

    this.discoveryService.startDiscovery();
  }

  public setMode(newMode: CommunicationMode) {
    this.mode = newMode;
  }

  public getMode(): CommunicationMode {
    return this.mode;
  }

  public getAdapter(sysId: number): IDroneAdapter {
    if (this.mode === 'MOCK') {
      return this.adapters.get(99) || new SimulatedDroneAdapter(sysId);
    }
    return this.adapters.get(sysId) || this.adapters.get(1)!;
  }

  public getDiscoveredDrones(): DroneDiscoveryService {
    return this.discoveryService;
  }
}

export const droneManager = MAVLinkDroneManager.getInstance();
