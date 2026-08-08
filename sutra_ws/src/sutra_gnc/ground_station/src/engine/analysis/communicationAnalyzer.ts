import type { Waypoint } from '../../types';
import type { CommunicationAnalysis } from '../types';

export class CommunicationAnalyzer {
  public static analyze(waypoints: Waypoint[]): CommunicationAnalysis {
    if (!waypoints || waypoints.length === 0) {
      return {
        averageSignalRssiDbm: -65,
        minCoveragePercent: 95,
        losBreachCount: 0,
        estimatedLatencyMs: 25,
        isCoverageAdequate: true
      };
    }

    const count = waypoints.length;
    const avgRssi = Math.max(-65 - count * 1.5, -95);
    const minCoverage = Math.max(98 - count * 2, 60);
    const losBreaches = count > 15 ? 1 : 0;
    const latency = Math.round(20 + count * 1.2);

    return {
      averageSignalRssiDbm: Math.round(avgRssi),
      minCoveragePercent: Math.round(minCoverage),
      losBreachCount: losBreaches,
      estimatedLatencyMs: latency,
      isCoverageAdequate: minCoverage >= 70
    };
  }
}
