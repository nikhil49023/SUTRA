import type { TargetClass } from '../types';

export class ObjectClassifier {
  public static classify(label: string): { category: TargetClass; threatWeight: number } {
    const lower = label.toLowerCase();
    if (lower.includes('military') || lower.includes('tank') || lower.includes('weapon')) {
      return { category: 'VEHICLE', threatWeight: 95 };
    }
    if (lower.includes('vehicle') || lower.includes('truck') || lower.includes('car')) {
      return { category: 'VEHICLE', threatWeight: 60 };
    }
    if (lower.includes('person') || lower.includes('human')) {
      return { category: 'PERSON', threatWeight: 40 };
    }
    if (lower.includes('hazard') || lower.includes('fire')) {
      return { category: 'HAZARD', threatWeight: 90 };
    }
    return { category: 'STRUCTURE', threatWeight: 20 };
  }
}
