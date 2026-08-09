export class CoverageService {
  /**
   * Computes cumulative area coverage percentage for multi-drone swarm
   */
  static calculateSwarmCoverage(activeDroneCount: number, flightDurationMin: number): number {
    // Approx 1.2 sq km per drone per 10 mins
    const totalAreaKm2 = +(activeDroneCount * 1.2 * (flightDurationMin / 10)).toFixed(2);
    const scannedPercent = Math.min(100, Math.round((totalAreaKm2 / 5.0) * 100));
    return scannedPercent;
  }
}
