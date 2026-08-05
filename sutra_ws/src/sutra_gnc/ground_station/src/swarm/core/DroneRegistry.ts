import type { SwarmNode } from '../types';
import type { DroneAsset } from '../../types';

export class DroneRegistry {
  private static nodes = new Map<string, SwarmNode>([
    [
      'ALPHA-01',
      {
        droneId: 'ALPHA-01',
        callsign: 'Alpha Leader',
        isLeader: true,
        isBackupLeader: false,
        status: 'IN_FLIGHT',
        batteryPercent: 95,
        signalQualityPercent: 98,
        lat: 45.1082,
        lng: 34.5225,
        altitudeAGLM: 100,
        headingDegrees: 45,
        speedKmh: 40,
        payloadType: '4K EO / IR',
        lastMeshHeartbeatTime: new Date().toISOString()
      }
    ],
    [
      'BRAVO-02',
      {
        droneId: 'BRAVO-02',
        callsign: 'Bravo Wingman',
        isLeader: false,
        isBackupLeader: true,
        status: 'IN_FLIGHT',
        batteryPercent: 91,
        signalQualityPercent: 95,
        lat: 45.1090,
        lng: 34.5235,
        altitudeAGLM: 100,
        headingDegrees: 45,
        speedKmh: 40,
        payloadType: 'LiDAR Thermal',
        lastMeshHeartbeatTime: new Date().toISOString()
      }
    ],
    [
      'CHARLIE-03',
      {
        droneId: 'CHARLIE-03',
        callsign: 'Charlie Scout',
        isLeader: false,
        isBackupLeader: false,
        status: 'IN_FLIGHT',
        batteryPercent: 88,
        signalQualityPercent: 92,
        lat: 45.1075,
        lng: 34.5215,
        altitudeAGLM: 100,
        headingDegrees: 45,
        speedKmh: 40,
        payloadType: 'Optical Zoom',
        lastMeshHeartbeatTime: new Date().toISOString()
      }
    ]
  ]);

  public static getNodes(): SwarmNode[] {
    return Array.from(this.nodes.values());
  }

  public static getNode(droneId: string): SwarmNode | undefined {
    return this.nodes.get(droneId);
  }

  public static updateNode(droneId: string, updates: Partial<SwarmNode>): void {
    const existing = this.nodes.get(droneId);
    if (existing) {
      Object.assign(existing, updates);
    }
  }

  public static syncFromDroneAssets(drones: DroneAsset[]): void {
    drones.forEach((d, idx) => {
      const node = this.nodes.get(d.id);
      if (node) {
        node.lat = d.lat;
        node.lng = d.lng;
        node.altitudeAGLM = d.altitude || 50;
        node.headingDegrees = d.heading || 0;
        node.speedKmh = d.groundSpeed || 0;
        node.batteryPercent = d.battery || 95;
      } else {
        this.nodes.set(d.id, {
          droneId: d.id,
          callsign: d.callsign || d.id,
          isLeader: idx === 0,
          isBackupLeader: idx === 1,
          status: 'IN_FLIGHT',
          batteryPercent: d.battery || 95,
          signalQualityPercent: d.signalStrength || 95,
          lat: d.lat,
          lng: d.lng,
          altitudeAGLM: d.altitude || 50,
          headingDegrees: d.heading || 0,
          speedKmh: d.groundSpeed || 0,
          payloadType: d.payload || 'EO Sensor',
          lastMeshHeartbeatTime: new Date().toISOString()
        });
      }
    });
  }
}
