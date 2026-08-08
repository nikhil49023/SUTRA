import type { WeatherAnalysis } from '../types';

export class WeatherAnalyzer {
  public static getCurrentWeather(): WeatherAnalysis {
    return {
      windSpeedMps: 4.5,
      windDirectionDegrees: 240,
      gustMps: 7.2,
      rainProbabilityPercent: 10,
      visibilityKm: 12.5,
      isWeatherSafe: true
    };
  }

  public static evaluateSafety(weather: WeatherAnalysis, maxWindMps: number = 12): boolean {
    return (
      weather.windSpeedMps <= maxWindMps &&
      weather.gustMps <= maxWindMps * 1.3 &&
      weather.rainProbabilityPercent < 50 &&
      weather.visibilityKm >= 3.0
    );
  }
}
