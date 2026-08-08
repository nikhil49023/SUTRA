import type { Waypoint } from '../../types';
import type { BatteryEstimation } from '../types';

export class BatteryEstimator {
  /**
   * Calculate detailed battery consumption metrics for a given waypoint route.
   */
  public static calculate(
    waypoints: Waypoint[],
    cruiseSpeedKmh: number = 40,
    payloadWeightKg: number = 0.5,
    batteryCapacityWh: number = 100
  ): BatteryEstimation {
    if (!waypoints || waypoints.length === 0) {
      return {
        missionBatteryPercent: 0,
        rtlReservePercent: 25,
        emergencyReservePercent: 10,
        hoverReservePercent: 10,
        payloadConsumptionWh: 0,
        remainingBatteryPercent: 100,
        batteryHealthPercent: 98,
        totalEnergyRequiredWh: 0,
        estimatedFlightTimeMin: 0,
        isSafeToFly: true
      };
    }

    // Calculate total route distance in meters
    let totalDistanceMeters = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const p1 = waypoints[i];
      const p2 = waypoints[i + 1];
      totalDistanceMeters += this.haversineDistance(p1.lat, p1.lng, p2.lat, p2.lng);
    }

    const cruiseSpeedMps = Math.max(cruiseSpeedKmh / 3.6, 1);
    const flightTimeSeconds = totalDistanceMeters / cruiseSpeedMps;
    const flightTimeMinutes = flightTimeSeconds / 60;

    // Power consumption physics model (Base UAV power ~180W + payload factor)
    const basePowerWatts = 180 + payloadWeightKg * 25;
    const hoverPowerWatts = 220 + payloadWeightKg * 30;

    const missionEnergyWh = (flightTimeHours(flightTimeSeconds) * basePowerWatts);
    const payloadExtraWh = (flightTimeHours(flightTimeSeconds) * (payloadWeightKg * 25));

    // Convert Wh to Percentage of batteryCapacityWh
    const missionPercent = Math.min((missionEnergyWh / batteryCapacityWh) * 100, 100);
    const rtlReservePercent = 25; // 25% safety buffer for Return to Launch
    const emergencyReservePercent = 10; // 10% emergency buffer
    const hoverReservePercent = 5; // 5% hover loiter buffer

    const totalRequiredPercent = missionPercent + rtlReservePercent + emergencyReservePercent;
    const remainingPercent = Math.max(100 - totalRequiredPercent, 0);

    return {
      missionBatteryPercent: Math.round(missionPercent * 10) / 10,
      rtlReservePercent,
      emergencyReservePercent,
      hoverReservePercent,
      payloadConsumptionWh: Math.round(payloadExtraWh * 10) / 10,
      remainingBatteryPercent: Math.round(remainingPercent * 10) / 10,
      batteryHealthPercent: 98,
      totalEnergyRequiredWh: Math.round(missionEnergyWh * 10) / 10,
      estimatedFlightTimeMin: Math.round(flightTimeMinutes * 10) / 10,
      isSafeToFly: totalRequiredPercent <= 100
    };
  }

  private static haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

function flightTimeHours(seconds: number): number {
  return seconds / 3600;
}
