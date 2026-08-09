export interface FlightLogEntry {
  id: string;
  missionName: string;
  droneCallsign: string;
  droneModel: string;
  operator: string;
  date: string;
  durationMinutes: number;
  distanceKm: number;
  maxAltitudeM: number;
  maxSpeedKmh: number;
  avgBatteryCurrentA: number;
  batteryStartPercent: number;
  batteryEndPercent: number;
  detectionsCount: number;
  status: 'COMPLETED' | 'ABORTED' | 'RTH_TRIGGERED';
  telemetryLog: { time: string; alt: number; speed: number; battery: number; signal: number }[];
}

export interface DroneUtilizationStats {
  callsign: string;
  totalFlightHours: number;
  totalMissions: number;
  healthScorePercent: number;
  lastMaintenanceDate: string;
}

export interface DetectionClassStats {
  category: string;
  count: number;
  avgConfidence: number;
}

export class AnalyticsService {
  /**
   * Aggregates total metrics across flight history logs
   */
  static aggregateFlightMetrics(logs: FlightLogEntry[]) {
    const totalMissions = logs.length;
    const completedMissions = logs.filter((l) => l.status === 'COMPLETED').length;
    const successRate = totalMissions > 0 ? Math.round((completedMissions / totalMissions) * 100) : 100;
    const totalDistanceKm = logs.reduce((acc, l) => acc + l.distanceKm, 0);
    const totalFlightMinutes = logs.reduce((acc, l) => acc + l.durationMinutes, 0);
    const totalDetections = logs.reduce((acc, l) => acc + l.detectionsCount, 0);

    return {
      totalMissions,
      successRate,
      totalDistanceKm: +totalDistanceKm.toFixed(1),
      totalFlightHours: +(totalFlightMinutes / 60).toFixed(1),
      totalDetections
    };
  }

  /**
   * Generates Battery Voltage Drop vs Motor Current load dataset for analysis
   */
  static getBatteryAnalysisData() {
    return [
      { loadCurrent: '5A (Idle)', voltage24V: 25.1, cellAvg: 4.18, temp: 32 },
      { loadCurrent: '12A (Cruise)', voltage24V: 24.6, cellAvg: 4.10, temp: 36 },
      { loadCurrent: '20A (Climb)', voltage24V: 24.1, cellAvg: 4.01, temp: 41 },
      { loadCurrent: '28A (Sprint)', voltage24V: 23.5, cellAvg: 3.91, temp: 46 },
      { loadCurrent: '35A (Peak)', voltage24V: 22.8, cellAvg: 3.80, temp: 52 },
    ];
  }

  /**
   * Generates Signal RSSI vs Range Distance dataset
   */
  static getSignalAnalysisData() {
    return [
      { rangeKm: '0.5 km', rssiPercent: 99, latencyMs: 8, packetLoss: 0.01 },
      { rangeKm: '2.0 km', rssiPercent: 94, latencyMs: 12, packetLoss: 0.04 },
      { rangeKm: '5.0 km', rssiPercent: 88, latencyMs: 16, packetLoss: 0.12 },
      { rangeKm: '8.0 km', rssiPercent: 78, latencyMs: 22, packetLoss: 0.45 },
      { rangeKm: '12.0 km', rssiPercent: 65, latencyMs: 34, packetLoss: 1.10 },
      { rangeKm: '15.0 km', rssiPercent: 52, latencyMs: 48, packetLoss: 2.30 },
    ];
  }

  /**
   * Export mission log as CSV format
   */
  static exportLogsToCSV(logs: FlightLogEntry[]): string {
    const headers = 'ID,Mission,Callsign,Operator,Date,Duration(min),Distance(km),Status\n';
    const rows = logs.map((l) => 
      `${l.id},"${l.missionName}",${l.droneCallsign},${l.operator},${l.date},${l.durationMinutes},${l.distanceKm},${l.status}`
    ).join('\n');
    return headers + rows;
  }
}
