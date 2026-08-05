import type { AIPredictions } from '../types';
import type { Waypoint } from '../../types';
import { BatteryPredictor } from './BatteryPredictor';
import { ETAEstimator } from './ETAEstimator';

export class FailurePredictor {
  public static predictAll(
    waypoints: Waypoint[],
    currentBatteryPercent: number = 95,
    signalStrength: number = 95
  ): AIPredictions {
    const bat = BatteryPredictor.predict(waypoints, currentBatteryPercent);
    const eta = ETAEstimator.estimateETA(waypoints);

    const commsLossProb = Math.max(0, Math.min(100, Math.round((100 - signalStrength) * 0.8)));

    const potentialFailures: string[] = [];
    if (bat.predictedEndBatteryPercent < 20) {
      potentialFailures.push('Low battery reserve at mission end (<20%).');
    }
    if (signalStrength < 60) {
      potentialFailures.push('Radio link quality degradation expected at maximum range.');
    }

    const successProb = Math.max(10, Math.min(99, Math.round(98 - commsLossProb * 0.5 - (100 - bat.predictedEndBatteryPercent) * 0.3)));

    return {
      predictedRemainingBatteryPercent: bat.predictedEndBatteryPercent,
      estimatedMissionDurationMin: eta.estimatedMinutes,
      etaTimestamp: eta.etaTimestamp,
      commsLossProbabilityPercent: commsLossProb,
      missionSuccessProbabilityPercent: successProb,
      potentialFailures
    };
  }
}
