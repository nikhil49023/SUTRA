import type { Waypoint } from '../types';
import { GISService } from '../services/gisService';
import { BatteryEstimator } from './batteryEstimator';
import { MissionValidator } from './missionValidator';
import { RouteOptimizer } from './routeOptimizer';
import { RiskEngine } from './riskEngine';
import type { ValidationReport } from './types';

export class MissionEngine {
  /**
   * Generates comprehensive pre-flight validation report prior to mission upload
   */
  static generateValidationReport(
    waypoints: Waypoint[],
    geofences: [number, number][][] = []
  ): ValidationReport {
    const coords: [number, number][] = waypoints.map((w) => [w.lat, w.lng]);
    const maxRangeKm = +GISService.calculateRouteDistance(coords).toFixed(2);

    // 1. Run Battery Estimator
    const batteryReport = BatteryEstimator.analyzeBattery(waypoints);

    // 2. Run Mission Validator
    const issues = MissionValidator.validate(waypoints, geofences);

    // 3. Complexity Score (0 to 100 based on waypoints and distance)
    const complexityScore = Math.min(100, Math.round(waypoints.length * 8 + maxRangeKm * 3));

    // 4. Assess Risk Level
    const riskLevel = RiskEngine.assessRisk(
      issues,
      maxRangeKm,
      batteryReport.remainingBatteryPercentAtRTH
    );

    // 5. Pre-flight Checklist
    const checklist = RiskEngine.generateChecklist(batteryReport.isRthReserveSafe);

    const hasError = issues.some((i) => i.severity === 'ERROR');

    return {
      isValid: !hasError && batteryReport.isRthReserveSafe,
      riskLevel,
      complexityScore,
      maxRangeKm,
      issues,
      batteryReport,
      checklist,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Optimizes route waypoints
   */
  static optimizeRoute(waypoints: Waypoint[]): Waypoint[] {
    return RouteOptimizer.optimizeWaypoints(waypoints);
  }
}
