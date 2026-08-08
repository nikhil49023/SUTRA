import type { TrackedTarget } from '../types';

export class TargetPrioritizer {
  public static prioritize(targets: TrackedTarget[]): TrackedTarget[] {
    return [...targets].sort((a, b) => b.priorityScore - a.priorityScore);
  }
}
