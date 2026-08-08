import { useTelemetryStore } from '../../services/telemetryStore';
import type { TelemetryData } from '../../types';

export function useTelemetry(): TelemetryData {
  const { currentTelemetry } = useTelemetryStore();
  return {
    pitch: currentTelemetry?.pitch || 0,
    roll: currentTelemetry?.roll || 0,
    yaw: currentTelemetry?.yaw || 45,
    altitudeAGL: currentTelemetry?.altitudeAGL || 100,
    altitudeMSL: currentTelemetry?.altitudeMSL || 450,
    groundSpeed: currentTelemetry?.groundSpeed || 40,
    airSpeed: currentTelemetry?.airSpeed || 42,
    climbRate: currentTelemetry?.climbRate || 0,
    batteryVoltage: currentTelemetry?.batteryVoltage || 22.2,
    batteryCurrent: currentTelemetry?.batteryCurrent || 14.5,
    batteryRemaining: currentTelemetry?.batteryRemaining || 95,
    cellVoltages: [3.7, 3.7, 3.7, 3.7, 3.7, 3.7],
    motorRPM: [5400, 5400, 5400, 5400],
    temperatureAvionics: 38,
    temperatureESC: 42,
    satellites: currentTelemetry?.satellites || 18,
    linkLatencyMs: currentTelemetry?.linkLatencyMs || 18
  };
}
