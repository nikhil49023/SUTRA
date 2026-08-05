import { FormationController } from '../formation/FormationController';

export class SwarmRenderer {
  public static getFormationLines(): { from: [number, number]; to: [number, number] }[] {
    const targets = FormationController.getTargetPositions();
    const leader = targets.find((t) => t.isLeader);

    if (!leader) return [];

    return targets
      .filter((t) => !t.isLeader)
      .map((t) => ({
        from: [leader.targetLng, leader.targetLat],
        to: [t.targetLng, t.targetLat]
      }));
  }
}
