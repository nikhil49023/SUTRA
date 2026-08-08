import type { TrackedTarget, TargetClass } from '../types';
import type { AIDetection } from '../../types';

export class TargetTracker {
  private static activeTargets = new Map<string, TrackedTarget>();
  private static targetCounter = 101;

  /**
   * Process raw AI visual detections and assign persistent IDs with trajectory tracking.
   */
  public static processDetections(detections: AIDetection[]): TrackedTarget[] {
    const updatedTargets: TrackedTarget[] = [];
    const now = new Date().toISOString();

    detections.forEach((det) => {
      // Find matching existing target within proximity
      let matchedTarget: TrackedTarget | undefined = undefined;
      const [latStr, lngStr] = (det.coordinates || '45.1082 N, 34.5225 E').split(', ');
      const lat = parseFloat(latStr) || 45.1082;
      const lng = parseFloat(lngStr) || 34.5225;

      for (const t of this.activeTargets.values()) {
        const dist = Math.sqrt(Math.pow(t.lat - lat, 2) + Math.pow(t.lng - lng, 2));
        if (dist < 0.002) {
          matchedTarget = t;
          break;
        }
      }

      if (matchedTarget) {
        matchedTarget.lat = lat;
        matchedTarget.lng = lng;
        matchedTarget.confidencePercent = Math.round(det.confidence * 100);
        matchedTarget.lastSeenAt = now;
        matchedTarget.status = 'TRACKED';
        updatedTargets.push(matchedTarget);
      } else {
        const id = `TGT-${this.targetCounter++}`;
        const newTarget: TrackedTarget = {
          id,
          label: det.type,
          category: this.mapCategory(det.type),
          confidencePercent: Math.round(det.confidence * 100),
          priorityScore: Math.round(det.confidence * 90),
          lat,
          lng,
          altitudeM: 0,
          speedKmh: 12.5,
          headingDegrees: 180,
          firstSeenAt: now,
          lastSeenAt: now,
          status: 'ACTIVE'
        };

        this.activeTargets.set(id, newTarget);
        updatedTargets.push(newTarget);
      }
    });

    return Array.from(this.activeTargets.values());
  }

  public static getActiveTargets(): TrackedTarget[] {
    return Array.from(this.activeTargets.values());
  }

  private static mapCategory(typeStr: string): TargetClass {
    const lower = typeStr.toLowerCase();
    if (lower.includes('car') || lower.includes('truck') || lower.includes('vehicle')) return 'VEHICLE';
    if (lower.includes('person') || lower.includes('human') || lower.includes('man')) return 'PERSON';
    if (lower.includes('plane') || lower.includes('drone') || lower.includes('aircraft')) return 'AIRCRAFT';
    if (lower.includes('ship') || lower.includes('boat') || lower.includes('vessel')) return 'VESSEL';
    if (lower.includes('fire') || lower.includes('hazard') || lower.includes('smoke')) return 'HAZARD';
    return 'STRUCTURE';
  }
}
