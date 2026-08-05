import type { AIRecommendation } from '../types';
import { MissionAdvisor } from './MissionAdvisor';
import type { Waypoint } from '../../types';

export class RecommendationEngine {
  public static getPrioritizedRecommendations(
    waypoints: Waypoint[],
    batteryPercent: number = 95
  ): AIRecommendation[] {
    const raw = MissionAdvisor.generateRecommendations(waypoints, batteryPercent);
    // Sort by impact score descending
    return raw.sort((a, b) => b.impactScore - a.impactScore);
  }
}
