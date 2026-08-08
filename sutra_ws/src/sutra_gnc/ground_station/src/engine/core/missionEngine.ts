import type { Waypoint } from '../../types';
import type { PreflightReport } from '../types';
import { missionStateMachine } from './missionStateMachine';
import { BatteryEstimator } from '../planning/batteryEstimator';
import { MissionValidator } from '../planning/missionValidator';
import { RouteOptimizer } from '../planning/routeOptimizer';
import { RiskEngine } from '../analysis/riskEngine';
import { PreflightReportGenerator } from '../reports/preflightReport';
import { missionTimeline } from '../reports/missionTimeline';

export class MissionEngine {
  private lastPreflightReport: PreflightReport | null = null;

  /**
   * Execute central planning workflow:
   * Battery Analysis -> Mission Validation -> Route Optimization -> Risk Analysis -> Preflight Report -> Mission Ready
   */
  public prepareMission(missionName: string, waypoints: Waypoint[]): PreflightReport {
    missionStateMachine.transitionTo('PLANNING', 'Started mission preparation pipeline');
    missionTimeline.addEvent('PLANNING', 'STATE_CHANGE', `Initiating mission planning pipeline for "${missionName}".`);

    // Step 1: Battery Analysis
    const batteryAnalysis = BatteryEstimator.calculate(waypoints);
    missionTimeline.addEvent('PLANNING', 'CHECKPOINT', `Battery analysis completed: ${batteryAnalysis.missionBatteryPercent}% required.`);

    // Step 2: Mission Validation
    const validation = MissionValidator.validate(waypoints);
    missionTimeline.addEvent('PLANNING', 'CHECKPOINT', `Validation completed: Status = ${validation.isValid ? 'VALID' : 'INVALID'}.`);

    // Step 3: Route Optimization
    const optimization = RouteOptimizer.optimize(waypoints);
    missionTimeline.addEvent('PLANNING', 'CHECKPOINT', `Route optimization completed: Saved ${optimization.distanceSavedKm}km.`);

    // Step 4: Risk Analysis
    const risk = RiskEngine.evaluateRisk(waypoints);
    missionTimeline.addEvent('PLANNING', 'CHECKPOINT', `Risk analysis completed: Overall Risk = ${risk.overallRisk}.`);

    // Step 5: Generate Preflight Report
    const preflightReport = PreflightReportGenerator.generate(missionName, waypoints);
    this.lastPreflightReport = preflightReport;

    // Step 6: Mission Ready State Transition
    if (preflightReport.isApprovedForTakeoff) {
      missionStateMachine.transitionTo('READY', 'Preflight checks passed successfully');
      missionTimeline.addEvent('READY', 'STATE_CHANGE', `Mission "${missionName}" approved and READY for execution.`);
    } else {
      missionTimeline.addEvent('PLANNING', 'WARNING', `Mission "${missionName}" requires resolution of safety items before launch.`);
    }

    return preflightReport;
  }

  public getLastPreflightReport(): PreflightReport | null {
    return this.lastPreflightReport;
  }

  public resetEngine(): void {
    this.lastPreflightReport = null;
    missionStateMachine.transitionTo('IDLE', 'Engine reset');
  }
}

export const missionEngine = new MissionEngine();
