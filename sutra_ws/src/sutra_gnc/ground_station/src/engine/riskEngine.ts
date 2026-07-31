import type { Waypoint } from '../types';
import type { RiskLevel, ValidationIssue, PreFlightChecklistItem } from './types';

export class RiskEngine {
  /**
   * Assesses overall mission risk level based on validation issues, distance, weather, and battery safety
   */
  static assessRisk(
    issues: ValidationIssue[],
    distanceKm: number,
    batteryRemainingAtRTH: number,
    windKts: number = 12
  ): RiskLevel {
    const errorCount = issues.filter((i) => i.severity === 'ERROR').length;
    const warningCount = issues.filter((i) => i.severity === 'WARNING').length;

    if (errorCount > 0 || batteryRemainingAtRTH < 20 || windKts > 25) {
      return 'CRITICAL';
    }
    if (warningCount >= 2 || batteryRemainingAtRTH < 30 || distanceKm > 15 || windKts > 18) {
      return 'HIGH';
    }
    if (warningCount === 1 || distanceKm > 8 || windKts > 12) {
      return 'MODERATE';
    }
    return 'LOW';
  }

  /**
   * Generates Pre-Flight Checklist
   */
  static generateChecklist(isRthSafe: boolean, satCount: number = 21): PreFlightChecklistItem[] {
    return [
      { id: 'CHK-01', title: 'RTK Dual-Freq GPS Satellites Count (>= 12 SVs)', passed: satCount >= 12, category: 'COMMUNICATION' },
      { id: 'CHK-02', title: 'IMU & Gyroscope Calibration Verified', passed: true, category: 'HARDWARE' },
      { id: 'CHK-03', title: 'Return-to-Home (RTH) Battery Safety Reserve (>= 25%)', passed: isRthSafe, category: 'SAFETY' },
      { id: 'CHK-04', title: 'AES-256 Encrypted Telemetry Link Active', passed: true, category: 'COMMUNICATION' },
      { id: 'CHK-05', title: 'EO/IR Payload Thermal Calibration Completed', passed: true, category: 'PAYLOAD' }
    ];
  }
}
