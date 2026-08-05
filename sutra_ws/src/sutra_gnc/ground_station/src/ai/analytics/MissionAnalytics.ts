import type { AIMissionAnalyticsSummary } from '../types';
import type { Waypoint, AIDetection } from '../../types';
import { SpatialAnalyticsEngine } from '../../gis/spatial/spatialAnalytics';

export class MissionAnalyticsEngine {
  public static computeAnalytics(
    waypoints: Waypoint[],
    detections: AIDetection[] = [],
    avgSpeedKmh: number = 38
  ): AIMissionAnalyticsSummary {
    const routeLenKm = SpatialAnalyticsEngine.calculateRouteLengthKm(waypoints);
    const coveragePercent = Math.min(100, Math.round(routeLenKm * 18));
    const efficiency = Math.min(100, Math.max(50, 95 - waypoints.length * 1.5));
    const whPerKm = Math.round(18.5 + (40 / Math.max(avgSpeedKmh, 1)));

    let workload: 'LOW' | 'OPTIMAL' | 'HIGH' | 'CRITICAL' = 'OPTIMAL';
    if (waypoints.length > 25) workload = 'CRITICAL';
    else if (waypoints.length > 15) workload = 'HIGH';
    else if (waypoints.length < 5) workload = 'LOW';

    return {
      missionEfficiencyScore: Math.round(efficiency),
      areaCoveragePercent: Math.round(coveragePercent),
      totalDetectionsCount: detections.length,
      avgSpeedKmh: Math.round(avgSpeedKmh * 10) / 10,
      batteryUtilizationWhPerKm: whPerKm,
      operatorWorkloadIndex: workload
    };
  }
}
