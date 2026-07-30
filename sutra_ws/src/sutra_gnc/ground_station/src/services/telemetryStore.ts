import { useState, useEffect } from 'react';
import { WebSocketManager } from './websocketManager';
import { TelemetryService, type TelemetryPacket, type FlightMode } from './telemetryService';

export interface OperationalEvent {
  id: string;
  timestamp: string;
  type: 'FLIGHT_MODE' | 'ALERT' | 'WAYPOINT' | 'SYSTEM';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
}

const globalWsManager = new WebSocketManager();
const globalTelemetryService = new TelemetryService(globalWsManager);

// Initial connection
globalWsManager.connect();

export function useTelemetryStore() {
  const [currentTelemetry, setCurrentTelemetry] = useState<TelemetryPacket>({
    pitch: 4.2,
    roll: -1.8,
    yaw: 142,
    altitudeAGL: 450,
    altitudeMSL: 1280,
    groundSpeed: 54.2,
    airSpeed: 58.0,
    climbRate: 1.2,
    batteryVoltage: 24.4,
    batteryCurrent: 18.5,
    batteryRemaining: 84,
    cellVoltages: [4.07, 4.06, 4.07, 4.06, 4.07, 4.07],
    motorRPM: [4250, 4240, 4260, 4245],
    temperatureAvionics: 38.4,
    temperatureESC: 44.2,
    satellites: 21,
    linkLatencyMs: 14,
    timestamp: new Date().toISOString(),
    timeFormatted: new Date().toTimeString().split(' ')[0],
    flightMode: 'AUTO_MISSION',
    powerWatts: 451.4
  });

  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryPacket[]>([]);
  const [events, setEvents] = useState<OperationalEvent[]>([
    {
      id: 'EVT-001',
      timestamp: '11:42:00',
      type: 'FLIGHT_MODE',
      severity: 'INFO',
      message: 'Switched flight mode to AUTO_MISSION'
    },
    {
      id: 'EVT-002',
      timestamp: '11:38:45',
      type: 'WAYPOINT',
      severity: 'INFO',
      message: 'Reached Waypoint 4 (Target Scan Zone)'
    },
    {
      id: 'EVT-003',
      timestamp: '11:29:10',
      type: 'ALERT',
      severity: 'WARNING',
      message: 'RF Frequency hop executed (5.8 GHz)'
    }
  ]);

  const [connectionStatus, setConnectionStatus] = useState<string>('FALLBACK_MOCK');

  useEffect(() => {
    globalWsManager.subscribe('connection', (statusData) => {
      setConnectionStatus(statusData.status);
    });

    globalTelemetryService.subscribeTelemetry((packet) => {
      setCurrentTelemetry(packet);

      setTelemetryHistory((prev) => {
        const next = [...prev, packet];
        if (next.length > 50) next.shift(); // keep last 50 data points
        return next;
      });
    });
  }, []);

  const changeFlightMode = (newMode: FlightMode) => {
    globalTelemetryService.setFlightMode(newMode);
    setCurrentTelemetry((prev) => ({ ...prev, flightMode: newMode }));

    // Log event
    const newEvt: OperationalEvent = {
      id: `EVT-${Date.now()}`,
      timestamp: new Date().toTimeString().split(' ')[0],
      type: 'FLIGHT_MODE',
      severity: 'INFO',
      message: `Flight mode changed to ${newMode}`
    };
    setEvents((prev) => [newEvt, ...prev]);
  };

  return {
    currentTelemetry,
    telemetryHistory,
    events,
    connectionStatus,
    changeFlightMode,
    triggerRTH: () => globalTelemetryService.triggerRTH()
  };
}
