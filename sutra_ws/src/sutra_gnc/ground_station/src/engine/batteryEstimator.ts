import type { Waypoint } from '../types';
import { GISService } from '../services/gisService';
import type { BatteryAnalysisReport } from './types';

export class BatteryEstimator {
  /**
   * Advanced battery discharge & RTH safety analysis
   */
  static analyzeBattery(
    waypoints: Waypoint[],
    initialBatteryPercent: number = 100,
    batteryCapacityWh: number = 244, // 24.4V * 10Ah 6S Pack
    cruiseSpeedKmh: number = 54
  ): BatteryAnalysisReport {
    if (waypoints.length < 2) {
      return {
        totalEnergyRequiredWh: 0,
        batteryConsumedPercent: 0,
        remainingBatteryPercentAtRTH: initialBatteryPercent,
        isRthReserveSafe: true,
        estimatedFlightTimeMin: 0
      };
    }

    const coords: [number, number][] = waypoints.map((w) => [w.lat, w.lng]);
    const totalDistanceKm = GISService.calculateRouteDistance(coords);

    // Flight duration (hours & minutes)
    const flightTimeHours = totalDistanceKm / cruiseSpeedKmh;
    const estimatedFlightTimeMin = Math.round(flightTimeHours * 60);

    // Energy model:
    // Horizontal energy: 12 Wh/km
    // Climb energy: 0.15 Wh/m gain
    // Payload energy: 15W constant draw
    let totalClimbGainM = 0;
    for (let i = 1; i < waypoints.length; i++) {
      const diff = waypoints[i].alt - waypoints[i - 1].alt;
      if (diff > 0) totalClimbGainM += diff;
    }

    const horizontalWh = totalDistanceKm * 12;
    const climbWh = totalClimbGainM * 0.15;
    const payloadWh = 15 * flightTimeHours;
    const totalEnergyRequiredWh = +(horizontalWh + climbWh + payloadWh).toFixed(1);

    const batteryConsumedPercent = Math.min(100, Math.round((totalEnergyRequiredWh / batteryCapacityWh) * 100));
    const remainingBatteryPercentAtRTH = Math.max(0, initialBatteryPercent - batteryConsumedPercent);

    // Safety RTH reserve threshold must be >= 25%
    const isRthReserveSafe = remainingBatteryPercentAtRTH >= 25;

    return {
      totalEnergyRequiredWh,
      batteryConsumedPercent,
      remainingBatteryPercentAtRTH,
      isRthReserveSafe,
      estimatedFlightTimeMin
    };
  }
}
