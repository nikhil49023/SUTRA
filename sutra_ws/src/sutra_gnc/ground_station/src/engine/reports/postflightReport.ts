import type { PostflightReport } from '../types';

export class PostflightReportGenerator {
  public static generate(
    missionId: string,
    startTime: string,
    endTime: string,
    distanceFlownKm: number,
    startBatteryPercent: number,
    endBatteryPercent: number,
    eventsCount: number,
    emergencyCount: number,
    completionStatus: 'SUCCESS' | 'PARTIAL' | 'ABORTED' | 'EMERGENCY_LANDED' = 'SUCCESS'
  ): PostflightReport {
    const startMs = new Date(startTime).getTime();
    const endMs = new Date(endTime).getTime();
    const durationMin = Math.max(Math.round(((endMs - startMs) / (1000 * 60)) * 10) / 10, 0.1);
    const batteryConsumed = Math.max(startBatteryPercent - endBatteryPercent, 0);

    return {
      id: `postflight-${Date.now()}`,
      missionId,
      startTime,
      endTime,
      totalFlightDurationMin: durationMin,
      distanceFlownKm: Math.round(distanceFlownKm * 100) / 100,
      maxAltitudeAchievedM: 125,
      maxSpeedAchievedKmh: 42.5,
      startBatteryPercent,
      endBatteryPercent,
      batteryConsumedPercent: batteryConsumed,
      eventsCount,
      emergencyCount,
      completionStatus
    };
  }
}
