import type { SwarmDroneMember, SwarmFormation, SwarmStatus } from './types';
import { FormationEngine } from './formationEngine';
import { CollisionAnalyzer } from './collisionAnalyzer';
import { CoverageService } from './coverageService';
import { FleetCoordinator } from './fleetCoordinator';

export class SwarmManager {
  private static instance: SwarmManager;
  private members: Map<number, SwarmDroneMember> = new Map();
  private activeFormation: SwarmFormation = 'LINE_VEE';
  private leaderSysId: number = 1;

  private constructor() {
    this.seedDefaultSwarmMembers();
  }

  public static getInstance(): SwarmManager {
    if (!SwarmManager.instance) {
      SwarmManager.instance = new SwarmManager();
    }
    return SwarmManager.instance;
  }

  private seedDefaultSwarmMembers() {
    const initialMembers: SwarmDroneMember[] = [
      { sysId: 1, callsign: 'SH-HEX-01', isLeader: true, batteryPercent: 94, signalQualityPercent: 98, position: { lat: 34.5225, lng: 45.1082, alt: 450 }, targetOffset: { dx: 0, dy: 0, dz: 0 }, status: 'IN_FORMATION' },
      { sysId: 2, callsign: 'SH-HEX-02', isLeader: false, batteryPercent: 88, signalQualityPercent: 95, position: { lat: 34.5220, lng: 45.1075, alt: 450 }, targetOffset: { dx: -25, dy: -25, dz: 0 }, status: 'IN_FORMATION' },
      { sysId: 3, callsign: 'SH-VTOL-01', isLeader: false, batteryPercent: 91, signalQualityPercent: 92, position: { lat: 34.5220, lng: 45.1089, alt: 450 }, targetOffset: { dx: 25, dy: -25, dz: 0 }, status: 'IN_FORMATION' }
    ];

    initialMembers.forEach((m) => this.members.set(m.sysId, m));
  }

  /**
   * Automatic Leader Election algorithm (selects drone with highest battery & signal strength)
   */
  public electLeader(): number {
    let bestSysId = this.leaderSysId;
    let maxScore = -1;

    for (const [sysId, member] of this.members.entries()) {
      const score = member.batteryPercent * 0.6 + member.signalQualityPercent * 0.4;
      if (score > maxScore) {
        maxScore = score;
        bestSysId = sysId;
      }
    }

    // Update leadership flags
    for (const [sysId, member] of this.members.entries()) {
      member.isLeader = sysId === bestSysId;
    }

    this.leaderSysId = bestSysId;
    return bestSysId;
  }

  public setFormation(formation: SwarmFormation): void {
    this.activeFormation = formation;
    FleetCoordinator.broadcastSwarmCommand('FORMATION_CHANGE', formation);

    // Recalculate member offsets
    let followerIdx = 0;
    for (const member of this.members.values()) {
      if (!member.isLeader) {
        member.targetOffset = FormationEngine.calculateFormationOffset(formation, followerIdx++);
      } else {
        member.targetOffset = { dx: 0, dy: 0, dz: 0 };
      }
    }
  }

  public getSwarmStatus(): SwarmStatus {
    const activeMembers = Array.from(this.members.values());
    const coverageScannedPercent = CoverageService.calculateSwarmCoverage(activeMembers.length, 25);

    return {
      swarmId: 'SWARM-ALPHA-01',
      leaderSysId: this.leaderSysId,
      activeMembersCount: activeMembers.length,
      formation: this.activeFormation,
      coverageScannedPercent,
      healthScore: 96
    };
  }

  public checkCollisions() {
    return CollisionAnalyzer.checkCollisionRisks(Array.from(this.members.values()));
  }

  public getMembers(): SwarmDroneMember[] {
    return Array.from(this.members.values());
  }
}

export const swarmManager = SwarmManager.getInstance();
