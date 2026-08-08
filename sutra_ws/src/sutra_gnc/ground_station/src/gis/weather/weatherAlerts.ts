import type { WeatherData, WeatherSuitability } from '../types';

export class WeatherAlertsEngine {
  /**
   * Evaluate weather parameters against drone flight envelope.
   */
  public static evaluateSuitability(
    weather: WeatherData,
    maxWindMps: number = 12.0
  ): WeatherSuitability {
    const alerts: string[] = [];
    let score = 100;

    if (weather.windSpeedMps > maxWindMps) {
      score -= 40;
      alerts.push(`High wind speed (${weather.windSpeedMps} m/s) exceeds maximum tolerance (${maxWindMps} m/s).`);
    } else if (weather.windSpeedMps > maxWindMps * 0.7) {
      score -= 15;
      alerts.push(`Moderate wind gusting (${weather.gustMps} m/s). Expect battery drain.`);
    }

    if (weather.rainProbabilityPercent > 40) {
      score -= 35;
      alerts.push(`Precipitation risk is ${weather.rainProbabilityPercent}%. Rain ingress danger.`);
    }

    if (weather.visibilityKm < 5.0) {
      score -= 25;
      alerts.push(`Reduced visibility (${weather.visibilityKm} km). Maintain visual line of sight.`);
    }

    const clampedScore = Math.max(0, Math.min(100, score));

    return {
      isSuitable: clampedScore >= 60 && weather.windSpeedMps <= maxWindMps,
      suitabilityScore: clampedScore,
      alerts,
      maxWindLimitMps: maxWindMps
    };
  }
}
