import type { InferenceResult, RouteRecommendation, BatteryPredictionResult } from './types';

export class PredictionEngine {
  /**
   * Generates route recommendations to evade detected hazards or optimize sensor coverage
   */
  static generateRouteRecommendations(detections: InferenceResult[]): RouteRecommendation[] {
    const recommendations: RouteRecommendation[] = [];
    const fireDetection = detections.find((d) => d.class === 'FIRE');

    if (fireDetection) {
      recommendations.push({
        id: `REC-EVADE-${Date.now()}`,
        type: 'EVADE_HAZARD',
        title: 'EVADE WILDFIRE SMOKE PLUME',
        reason: `Active fire detected at ${fireDetection.gpsCoordinates.lat} N. Recommend +100m climb & 200m westward offset.`,
        suggestedWaypoints: [
          { lat: fireDetection.gpsCoordinates.lat + 0.005, lng: fireDetection.gpsCoordinates.lng - 0.008, alt: 550 },
          { lat: fireDetection.gpsCoordinates.lat + 0.010, lng: fireDetection.gpsCoordinates.lng - 0.004, alt: 500 }
        ],
        distanceImpactKm: 0.8
      });
    }

    return recommendations;
  }

  /**
   * Predicts battery depletion rate (% per min) and depletion timestamp based on workload
   */
  static predictBatteryDepletion(
    currentBatteryPercent: number,
    batteryVoltage: number,
    currentAmps: number
  ): BatteryPredictionResult {
    // Current draw ~18.5A -> consumption rate approx 1.8% per minute
    const consumptionRatePercentPerMin = +(currentAmps * 0.095).toFixed(2);
    const estimatedMinutesLeft = Math.max(0, Math.round(currentBatteryPercent / consumptionRatePercentPerMin));

    const depletionTimeDate = new Date(Date.now() + estimatedMinutesLeft * 60 * 1000);
    const predictedDepletionTime = depletionTimeDate.toTimeString().split(' ')[0];

    return {
      remainingPercent: currentBatteryPercent,
      estimatedMinutesLeft,
      consumptionRatePercentPerMin,
      predictedDepletionTime,
      warningTriggered: currentBatteryPercent < 25
    };
  }
}
