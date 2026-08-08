import { FormationController } from './FormationController';
import { DroneRegistry } from '../core/DroneRegistry';

export class LeaderFollowerEngine {
  public static calculateFollowerErrors(): { droneId: string; errorDistanceMeters: number }[] {
    const targets = FormationController.getTargetPositions();
    return targets.map((t) => {
      const actual = DroneRegistry.getNode(t.droneId);
      if (!actual) return { droneId: t.droneId, errorDistanceMeters: 0 };
      const dist = Math.sqrt(Math.pow((actual.lat - t.targetLat) * 111320, 2) + Math.pow((actual.lng - t.targetLng) * 111320, 2));
      return { droneId: t.droneId, errorDistanceMeters: Math.round(dist * 10) / 10 };
    });
  }
}
