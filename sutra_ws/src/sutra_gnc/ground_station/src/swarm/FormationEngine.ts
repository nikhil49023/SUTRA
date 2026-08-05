import type { FormationType, FormationConfig, FormationTarget } from './FormationTypes';
import { FormationCalculator } from './FormationCalculator';
import { formationAnimator } from './FormationAnimator';
import { fleetStore } from '../store/FleetStore';

export class FormationEngine {
  private static instance: FormationEngine;

  private config: FormationConfig = {
    type: 'V_FORMATION',
    leaderId: 'DRONE_01',
    spacingMeters: 25,
    headingDegrees: 45,
    altOffsetMeters: 0
  };

  private currentTargets: FormationTarget[] = [];

  private constructor() {
    // Intentionally empty to avoid circular static initialization
  }

  public static getInstance(): FormationEngine {
    if (!FormationEngine.instance) {
      FormationEngine.instance = new FormationEngine();
    }
    return FormationEngine.instance;
  }

  public getConfig(): FormationConfig {
    return { ...this.config };
  }

  public setFormation(type: FormationType): void {
    if (this.config.type === type) return;
    this.config.type = type;
    this.recalculateAndAnimate(false);
  }

  public setSpacing(spacingMeters: number): void {
    if (this.config.spacingMeters === spacingMeters) return;
    this.config.spacingMeters = spacingMeters;
    this.recalculateAndAnimate(false);
  }

  public setLeader(leaderId: string): void {
    if (this.config.leaderId === leaderId) return;
    this.config.leaderId = leaderId;
    this.recalculateAndAnimate(true);
  }

  public setHeading(headingDegrees: number): void {
    this.config.headingDegrees = headingDegrees;
    this.recalculateAndAnimate(true);
  }

  /**
   * Called continuously during mission flight when Leader position updates.
   * Lock followers to leader position immediately during active flight so no drone is left behind!
   */
  public updateLeaderPosition(leaderPos: { lat: number; lng: number; alt: number; heading: number }): void {
    this.config.headingDegrees = leaderPos.heading;
    this.recalculateAndAnimate(true);
  }

  public getCurrentTargets(): FormationTarget[] {
    return [...this.currentTargets];
  }

  public recalculateAndAnimate(immediate: boolean = false): FormationTarget[] {
    if (!fleetStore) return [];
    const drones = fleetStore.getDrones();
    if (!drones || drones.length === 0) return [];

    const droneIds = drones.map((d) => d.id);
    const leader = drones.find((d) => d.id === this.config.leaderId) || drones[0];

    const leaderPos = {
      lat: leader.lat,
      lng: leader.lng,
      alt: leader.altitude || 50,
      heading: leader.heading || this.config.headingDegrees
    };

    this.currentTargets = FormationCalculator.calculateTargetPositions(
      leaderPos,
      droneIds,
      this.config.type,
      this.config.spacingMeters,
      leader.id
    );

    formationAnimator.animateToTargets(this.currentTargets, immediate);
    return this.currentTargets;
  }
}

export const formationEngine = FormationEngine.getInstance();
