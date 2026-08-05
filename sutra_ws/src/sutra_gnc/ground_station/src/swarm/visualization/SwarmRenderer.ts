import { formationEngine } from '../FormationEngine';

export class SwarmRenderer {
  public static getFormationLines(): { from: [number, number]; to: [number, number]; droneId: string }[] {
    const targets = formationEngine.getCurrentTargets();
    const leader = targets.find((t) => t.isLeader);

    if (!leader) return [];

    return targets
      .filter((t) => !t.isLeader)
      .map((t) => ({
        droneId: t.droneId,
        from: [leader.targetLng, leader.targetLat],
        to: [t.targetLng, t.targetLat]
      }));
  }

  public static getFormationCenter(): [number, number] | null {
    const targets = formationEngine.getCurrentTargets();
    if (targets.length === 0) return null;

    const sumLat = targets.reduce((sum, t) => sum + t.targetLat, 0);
    const sumLng = targets.reduce((sum, t) => sum + t.targetLng, 0);

    return [sumLng / targets.length, sumLat / targets.length];
  }
}
