import { useState } from 'react';
import { AnalyticsService, type FlightLogEntry, type DroneUtilizationStats } from './analyticsService';

export const MOCK_FLIGHT_LOGS: FlightLogEntry[] = [
  {
    id: 'LOG-2026-001',
    missionName: 'Op Desert Falcon - Sector 4-B',
    droneCallsign: 'PHANTOM-ALPHA',
    droneModel: 'Apex Reaper Mk-IV',
    operator: 'Capt. Vance',
    date: '2026-07-29',
    durationMinutes: 48,
    distanceKm: 18.4,
    maxAltitudeM: 620,
    maxSpeedKmh: 64,
    avgBatteryCurrentA: 19.2,
    batteryStartPercent: 100,
    batteryEndPercent: 28,
    detectionsCount: 14,
    status: 'COMPLETED',
    telemetryLog: [
      { time: '00:00', alt: 0, speed: 0, battery: 100, signal: 99 },
      { time: '00:10', alt: 250, speed: 42, battery: 88, signal: 96 },
      { time: '00:20', alt: 450, speed: 54, battery: 72, signal: 92 },
      { time: '00:30', alt: 550, speed: 58, battery: 55, signal: 88 },
      { time: '00:40', alt: 420, speed: 50, battery: 38, signal: 91 },
      { time: '00:48', alt: 0, speed: 0, battery: 28, signal: 98 },
    ]
  },
  {
    id: 'LOG-2026-002',
    missionName: 'Sector 3 Reconnaissance',
    droneCallsign: 'SPECTRE-BETA',
    droneModel: 'Titan Hawk VTOL',
    operator: 'Lt. Chen',
    date: '2026-07-28',
    durationMinutes: 72,
    distanceKm: 32.1,
    maxAltitudeM: 800,
    maxSpeedKmh: 82,
    avgBatteryCurrentA: 21.5,
    batteryStartPercent: 100,
    batteryEndPercent: 15,
    detectionsCount: 8,
    status: 'COMPLETED',
    telemetryLog: [
      { time: '00:00', alt: 0, speed: 0, battery: 100, signal: 99 },
      { time: '00:20', alt: 400, speed: 65, battery: 78, signal: 94 },
      { time: '00:40', alt: 750, speed: 80, battery: 52, signal: 85 },
      { time: '01:00', alt: 600, speed: 72, battery: 30, signal: 80 },
      { time: '01:12', alt: 0, speed: 0, battery: 15, signal: 95 },
    ]
  },
  {
    id: 'LOG-2026-003',
    missionName: 'Perimeter Alert Investigation',
    droneCallsign: 'SHADOW-DELTA',
    droneModel: 'Apex Reaper Mk-IV',
    operator: 'Capt. Vance',
    date: '2026-07-27',
    durationMinutes: 24,
    distanceKm: 9.8,
    maxAltitudeM: 350,
    maxSpeedKmh: 58,
    avgBatteryCurrentA: 18.0,
    batteryStartPercent: 95,
    batteryEndPercent: 52,
    detectionsCount: 3,
    status: 'RTH_TRIGGERED',
    telemetryLog: [
      { time: '00:00', alt: 0, speed: 0, battery: 95, signal: 99 },
      { time: '00:12', alt: 350, speed: 52, battery: 74, signal: 91 },
      { time: '00:24', alt: 0, speed: 0, battery: 52, signal: 97 },
    ]
  }
];

export const MOCK_UTILIZATION_STATS: DroneUtilizationStats[] = [
  { callsign: 'PHANTOM-ALPHA', totalFlightHours: 142.5, totalMissions: 84, healthScorePercent: 98, lastMaintenanceDate: '2026-07-15' },
  { callsign: 'SPECTRE-BETA', totalFlightHours: 210.8, totalMissions: 112, healthScorePercent: 94, lastMaintenanceDate: '2026-07-10' },
  { callsign: 'VORTEX-GAMMA', totalFlightHours: 68.2, totalMissions: 32, healthScorePercent: 100, lastMaintenanceDate: '2026-07-22' },
  { callsign: 'SHADOW-DELTA', totalFlightHours: 185.0, totalMissions: 96, healthScorePercent: 91, lastMaintenanceDate: '2026-07-02' },
];

export function useAnalyticsStore() {
  const [logs] = useState<FlightLogEntry[]>(MOCK_FLIGHT_LOGS);
  const [selectedLog, setSelectedLog] = useState<FlightLogEntry>(MOCK_FLIGHT_LOGS[0]);
  const [comparisonLog, setComparisonLog] = useState<FlightLogEntry | null>(MOCK_FLIGHT_LOGS[1]);
  const [replayIndex, setReplayIndex] = useState<number>(0);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);

  const aggregatedMetrics = AnalyticsService.aggregateFlightMetrics(logs);
  const batteryData = AnalyticsService.getBatteryAnalysisData();
  const signalData = AnalyticsService.getSignalAnalysisData();

  const handleExportCSV = () => {
    const csvContent = AnalyticsService.exportLogsToCSV(logs);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Drone_Flight_Analytics_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    logs,
    selectedLog,
    setSelectedLog,
    comparisonLog,
    setComparisonLog,
    replayIndex,
    setReplayIndex,
    isReplaying,
    setIsReplaying,
    aggregatedMetrics,
    batteryData,
    signalData,
    utilizationStats: MOCK_UTILIZATION_STATS,
    handleExportCSV
  };
}
