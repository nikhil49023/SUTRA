export type PopulationDensityLevel = 'VERY_LOW' | 'LOW' | 'MODERATE' | 'HIGH' | 'URBAN_DENSE';

export class PopulationDensityEngine {
  /**
   * Evaluate population density index for risk mitigation.
   */
  public static evaluateDensity(lat: number, lng: number): {
    densityLevel: PopulationDensityLevel;
    estimatedPopPerKm2: number;
    isOverpopulatedRisk: boolean;
  } {
    const distFromCenter = Math.sqrt(Math.pow(lat - 45.1082, 2) + Math.pow(lng - 34.5225, 2));

    let densityLevel: PopulationDensityLevel = 'VERY_LOW';
    let popPerKm2 = 25;

    if (distFromCenter < 0.002) {
      densityLevel = 'URBAN_DENSE';
      popPerKm2 = 2400;
    } else if (distFromCenter < 0.005) {
      densityLevel = 'HIGH';
      popPerKm2 = 1200;
    } else if (distFromCenter < 0.010) {
      densityLevel = 'MODERATE';
      popPerKm2 = 450;
    } else if (distFromCenter < 0.020) {
      densityLevel = 'LOW';
      popPerKm2 = 120;
    }

    return {
      densityLevel,
      estimatedPopPerKm2: popPerKm2,
      isOverpopulatedRisk: densityLevel === 'HIGH' || densityLevel === 'URBAN_DENSE'
    };
  }
}
