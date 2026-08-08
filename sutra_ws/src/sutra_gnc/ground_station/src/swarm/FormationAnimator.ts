import type { FormationTarget } from './FormationTypes';
import { fleetStore } from '../store/FleetStore';

export class FormationAnimator {
  private animationFrameId: number | null = null;
  private isAnimating: boolean = false;
  private currentTargets: FormationTarget[] = [];
  private lerpFactor: number = 0.12; // Smooth 60 FPS interpolation factor

  public animateToTargets(targets: FormationTarget[], immediate: boolean = false): void {
    this.currentTargets = targets;

    if (immediate) {
      // Direct position locking during active mission flight so no follower is left behind
      targets.forEach((target) => {
        if (target.isLeader) return; // Leader position is driven by mission execution engine
        fleetStore.updateDronePosition(target.droneId, {
          lat: target.targetLat,
          lng: target.targetLng,
          altitude: target.targetAlt,
          heading: target.headingDegrees,
          status: 'IN_FLIGHT'
        });
      });
      return;
    }

    if (!this.isAnimating) {
      this.startAnimationLoop();
    }
  }

  private startAnimationLoop(): void {
    this.isAnimating = true;

    const step = () => {
      if (!this.isAnimating || this.currentTargets.length === 0) {
        this.isAnimating = false;
        return;
      }

      let allReached = true;
      const currentDrones = fleetStore.getDrones();

      this.currentTargets.forEach((target) => {
        if (target.isLeader) return; // Leader position is driven by flight engine

        const currentDrone = currentDrones.find((d) => d.id === target.droneId);
        if (!currentDrone) return;

        const dLat = target.targetLat - currentDrone.lat;
        const dLng = target.targetLng - currentDrone.lng;
        const dAlt = target.targetAlt - currentDrone.altitude;
        const dHeading = target.headingDegrees - currentDrone.heading;

        const distSq = dLat * dLat + dLng * dLng;

        if (distSq > 1e-11 || Math.abs(dAlt) > 0.1 || Math.abs(dHeading) > 0.5) {
          allReached = false;

          const newLat = +(currentDrone.lat + dLat * this.lerpFactor).toFixed(6);
          const newLng = +(currentDrone.lng + dLng * this.lerpFactor).toFixed(6);
          const newAlt = Math.round(currentDrone.altitude + dAlt * this.lerpFactor);
          const newHeading = Math.round((currentDrone.heading + dHeading * this.lerpFactor + 360) % 360);

          fleetStore.updateDronePosition(target.droneId, {
            lat: newLat,
            lng: newLng,
            altitude: newAlt,
            heading: newHeading,
            status: 'IN_FLIGHT'
          });
        }
      });

      if (!allReached) {
        this.animationFrameId = requestAnimationFrame(step);
      } else {
        this.isAnimating = false;
        this.animationFrameId = null;
      }
    };

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.animationFrameId = requestAnimationFrame(step);
  }

  public stop(): void {
    this.isAnimating = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}

export const formationAnimator = new FormationAnimator();
