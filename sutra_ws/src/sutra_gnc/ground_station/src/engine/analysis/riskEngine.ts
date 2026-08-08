import type { Waypoint } from '../../types';
import type { RiskAnalysis, RiskLevel } from '../types';
import { BatteryEstimator } from '../planning/batteryEstimator';
import { geofenceStore } from '../../geofence/store/GeofenceStore';

export class RiskEngine {
  public static evaluateRisk(waypoints: Waypoint[]): RiskAnalysis {
    if (!waypoints || waypoints.length === 0) {
      return {
        overallRisk: 'LOW',
        riskScore: 5,
        factors: {
          batteryRisk: 'LOW',
          terrainRisk: 'LOW',
          weatherRisk: 'LOW',
          communicationRisk: 'LOW',
          geofenceRisk: 'LOW',
          complexityRisk: 'LOW'
        },
        recommendations: ['No active waypoints loaded.']
      };
    }

    const battery = BatteryEstimator.calculate(waypoints);
    const geofences = geofenceStore.getState().collection.features;

    // 1. Battery Risk
    let batteryRisk: RiskLevel = 'LOW';
    if (battery.remainingBatteryPercent < 15) batteryRisk = 'CRITICAL';
    else if (battery.remainingBatteryPercent < 25) batteryRisk = 'HIGH';
    else if (battery.remainingBatteryPercent < 35) batteryRisk = 'MEDIUM';

    // 2. Geofence Proximity Risk
    let geofenceRisk: RiskLevel = 'LOW';
    if (geofences.some((f) => f.properties?.type === 'NO_FLY')) {
      geofenceRisk = 'HIGH';
    } else if (geofences.some((f) => f.properties?.type === 'WARNING')) {
      geofenceRisk = 'MEDIUM';
    }

    // 3. Complexity Risk
    let complexityRisk: RiskLevel = 'LOW';
    if (waypoints.length > 20) complexityRisk = 'HIGH';
    else if (waypoints.length > 10) complexityRisk = 'MEDIUM';

    // 4. Weather & Communication & Terrain simulated risks
    const weatherRisk: RiskLevel = 'LOW';
    const communicationRisk: RiskLevel = waypoints.length > 15 ? 'MEDIUM' : 'LOW';
    const terrainRisk: RiskLevel = 'LOW';

    // Compute composite Risk Score (0-100)
    let score = 10;
    if (batteryRisk === 'CRITICAL') score += 40;
    else if (batteryRisk === 'HIGH') score += 25;
    else if (batteryRisk === 'MEDIUM') score += 15;

    if (geofenceRisk === 'HIGH') score += 20;
    else if (geofenceRisk === 'MEDIUM') score += 10;

    if (complexityRisk === 'HIGH') score += 15;
    else if (complexityRisk === 'MEDIUM') score += 10;

    score = Math.min(score, 100);

    let overallRisk: RiskLevel = 'LOW';
    if (score >= 75 || batteryRisk === 'CRITICAL') overallRisk = 'CRITICAL';
    else if (score >= 50 || batteryRisk === 'HIGH') overallRisk = 'HIGH';
    else if (score >= 25 || batteryRisk === 'MEDIUM') overallRisk = 'MEDIUM';

    const recommendations: string[] = [];
    if (batteryRisk !== 'LOW') recommendations.push('Reduce mission waypoint distance or adjust cruise speed to save battery.');
    if (geofenceRisk !== 'LOW') recommendations.push('Ensure flight path remains at least 50m clear of No-Fly Zone perimeters.');
    if (complexityRisk !== 'LOW') recommendations.push('Simplify route turns to optimize flight efficiency.');
    if (recommendations.length === 0) recommendations.push('All parameters within nominal safety margins.');

    return {
      overallRisk,
      riskScore: score,
      factors: {
        batteryRisk,
        terrainRisk,
        weatherRisk,
        communicationRisk,
        geofenceRisk,
        complexityRisk
      },
      recommendations
    };
  }
}
