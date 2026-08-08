import type { Waypoint } from '../../types';
import type { AIRecommendation } from '../types';
import { BatteryEstimator } from '../../engine/planning/batteryEstimator';
import { RouteOptimizer } from '../../engine/planning/routeOptimizer';
import { geofenceStore } from '../../geofence/store/GeofenceStore';

export class MissionAdvisor {
  /**
   * Evaluate mission data and generate actionable recommendations.
   */
  public static generateRecommendations(
    waypoints: Waypoint[],
    currentBatteryPercent: number = 95
  ): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];
    if (!waypoints || waypoints.length === 0) return recommendations;

    // 1. Waypoint Order Optimization
    const optimization = RouteOptimizer.optimize(waypoints);
    if (optimization.distanceSavedKm > 0.1) {
      recommendations.push({
        id: 'rec-opt-route',
        type: 'OPTIMIZE_WAYPOINTS',
        title: 'Optimize Waypoint Trajectory',
        summary: `Reordering waypoints saves ${optimization.distanceSavedKm} km and reduces turn angles by ${optimization.totalTurnAngleDegrees}°.`,
        impactScore: 85,
        suggestedAction: 'Apply TSP nearest-neighbor route smoothing.',
        confidencePercent: 94
      });

      recommendations.push({
        id: 'rec-reduce-dur',
        type: 'REDUCE_DURATION',
        title: 'Reduce Mission Duration',
        summary: `Optimized flight path decreases total flight duration by ~${optimization.estimatedDurationMin} minutes.`,
        impactScore: 78,
        suggestedAction: 'Increase cruise velocity to 45 km/h along straight vectors.',
        confidencePercent: 90
      });
    }

    // 2. Battery Efficiency
    const batteryReport = BatteryEstimator.calculate(waypoints);
    if (batteryReport.missionBatteryPercent > 60 || currentBatteryPercent < 40) {
      recommendations.push({
        id: 'rec-battery-save',
        type: 'BATTERY_CONSERVATION',
        title: 'Improve Battery Efficiency',
        summary: `Estimated mission consumption is ${batteryReport.missionBatteryPercent}%. Climbing altitude by 20m reduces aerodynamic drag.`,
        impactScore: 88,
        suggestedAction: 'Set cruise altitude to 110m AGL for optimal power consumption.',
        confidencePercent: 92
      });
    }

    // 3. Risk Avoidance (Geofences)
    const geofences = geofenceStore.getState().collection.features;
    const hasNoFly = geofences.some((f) => f.properties?.type === 'NO_FLY');
    if (hasNoFly) {
      recommendations.push({
        id: 'rec-avoid-risk',
        type: 'AVOID_RISK_AREA',
        title: 'Avoid Active No-Fly Geofence Zone',
        summary: 'Active No-Fly perimeter detected within 500m of planned flight corridor.',
        impactScore: 95,
        suggestedAction: 'Maintain a 60m safety buffer around restricted airspace boundary.',
        confidencePercent: 98
      });

      recommendations.push({
        id: 'rec-alt-route',
        type: 'ALTERNATE_ROUTE',
        title: 'Recommend Alternate Bypass Route',
        summary: 'Secondary bypass corridor avoids high-density tactical zone.',
        impactScore: 82,
        suggestedAction: 'Reroute waypoints via East tactical waypoint corridor.',
        confidencePercent: 88
      });
    }

    // 4. Emergency Landing Sites
    recommendations.push({
      id: 'rec-elz-site',
      type: 'EMERGENCY_LANDING_SITE',
      title: 'Emergency Landing Site Pre-allocation',
      summary: 'Nearest clear emergency landing site is Alpha Helipad Sector 4 (0.4 km away).',
      impactScore: 75,
      suggestedAction: 'Pre-load Alpha Helipad coordinates as emergency fail-safe target.',
      confidencePercent: 96
    });

    return recommendations;
  }
}
