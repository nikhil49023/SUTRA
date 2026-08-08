import type { Waypoint } from '../../types';
import type { PreflightReport } from '../types';
import { BatteryEstimator } from '../planning/batteryEstimator';
import { MissionValidator } from '../planning/missionValidator';
import { RouteOptimizer } from '../planning/routeOptimizer';
import { RiskEngine } from '../analysis/riskEngine';
import { TerrainAnalyzer } from '../analysis/terrainAnalyzer';
import { WeatherAnalyzer } from '../analysis/weatherAnalyzer';
import { CommunicationAnalyzer } from '../analysis/communicationAnalyzer';
import { missionStateMachine } from '../core/missionStateMachine';

export class PreflightReportGenerator {
  public static generate(missionName: string, waypoints: Waypoint[]): PreflightReport {
    const batteryAnalysis = BatteryEstimator.calculate(waypoints);
    const validation = MissionValidator.validate(waypoints);
    const optimization = RouteOptimizer.optimize(waypoints);
    const risk = RiskEngine.evaluateRisk(waypoints);
    const terrain = TerrainAnalyzer.analyze(waypoints);
    const weather = WeatherAnalyzer.getCurrentWeather();
    const communication = CommunicationAnalyzer.analyze(waypoints);

    const isApprovedForTakeoff = validation.isValid && risk.overallRisk !== 'CRITICAL' && weather.isWeatherSafe;

    return {
      id: `preflight-${Date.now()}`,
      missionName,
      createdAt: new Date().toISOString(),
      state: missionStateMachine.getState(),
      batteryAnalysis,
      validation,
      optimization,
      risk,
      terrain,
      weather,
      communication,
      isApprovedForTakeoff
    };
  }
}
