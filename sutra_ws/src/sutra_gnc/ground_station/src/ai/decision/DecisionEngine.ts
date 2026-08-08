import { MissionAdvisor } from './MissionAdvisor';
import { ThreatAssessmentEngine } from './ThreatAssessment';
import type { Waypoint, AIDetection } from '../../types';

export class DecisionEngine {
  public static evaluateAll(waypoints: Waypoint[], detections: AIDetection[] = [], battery: number = 95) {
    const recommendations = MissionAdvisor.generateRecommendations(waypoints, battery);
    const threatAssessment = ThreatAssessmentEngine.evaluateThreats(waypoints, detections, battery);

    return {
      recommendations,
      threatAssessment
    };
  }
}
