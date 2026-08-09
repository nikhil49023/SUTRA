import type { InferenceResult } from './types';

export interface AIMissionRecommendation {
  id: string;
  category: 'ROUTE' | 'TARGET' | 'SAFETY' | 'TACTICAL';
  title: string;
  actionText: string;
  confidence: number; // %
  reasoning: string;
}

export class RecommendationEngine {
  /**
   * Generates AI tactical mission recommendations based on telemetry and CV detections
   */
  static generateRecommendations(
    detections: InferenceResult[],
    currentBatteryPercent: number = 82
  ): AIMissionRecommendation[] {
    const recs: AIMissionRecommendation[] = [];

    const fireTarget = detections.find((d) => d.class === 'FIRE');
    if (fireTarget) {
      recs.push({
        id: `REC-FIRE-${Date.now()}`,
        category: 'TACTICAL',
        title: 'EXECUTE THERMAL LOITER OVER FIRE FRONT',
        actionText: 'ENGAGE CIRCULAR ORBIT',
        confidence: 96,
        reasoning: 'Active fire front detected. Recommend 360-degree thermal loiter at 450m AGL.'
      });
    }

    if (currentBatteryPercent < 35) {
      recs.push({
        id: `REC-BAT-${Date.now()}`,
        category: 'SAFETY',
        title: 'INITIATE EARLY RTH DESCENT',
        actionText: 'TRIGGER RTH',
        confidence: 99,
        reasoning: 'Battery projected to hit 25% reserve threshold in 4.2 minutes.'
      });
    }

    recs.push({
      id: `REC-ROUTE-${Date.now()}`,
      category: 'ROUTE',
      title: 'OPTIMIZE WAYPOINT TURN RADII',
      actionText: 'SMOOTH PATH',
      confidence: 91,
      reasoning: 'Bezier path smoothing will conserve 4.8% battery energy across remaining leg.'
    });

    return recs;
  }
}
