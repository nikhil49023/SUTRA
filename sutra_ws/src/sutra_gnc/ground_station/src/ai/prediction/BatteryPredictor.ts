import type { Waypoint } from '../../types';
import { BatteryEstimator } from '../../engine/planning/batteryEstimator';

export class BatteryPredictor {
  /**
   * Predict remaining battery percentage and drain rate (%/min).
   */
  public static predict(waypoints: Waypoint[], currentBatteryPercent: number = 95): {
    predictedEndBatteryPercent: number;
    drainRatePercentPerMin: number;
    isSafeToComplete: boolean;
  } {
    const est = BatteryEstimator.calculate(waypoints);
    const endPercent = Math.max(0, currentBatteryPercent - est.missionBatteryPercent);
    const drainRate = est.estimatedFlightTimeMin > 0 ? est.missionBatteryPercent / est.estimatedFlightTimeMin : 1.5;

    return {
      predictedEndBatteryPercent: Math.round(endPercent * 10) / 10,
      drainRatePercentPerMin: Math.round(drainRate * 10) / 10,
      isSafeToComplete: endPercent >= 20
    };
  }
}
