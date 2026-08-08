import { DroneRegistry } from '../core/DroneRegistry';

export class SwarmMesh {
  public static broadcastStatus(): void {
    const nodes = DroneRegistry.getNodes();
    const now = new Date().toISOString();
    nodes.forEach((n) => {
      n.lastMeshHeartbeatTime = now;
    });
  }
}
