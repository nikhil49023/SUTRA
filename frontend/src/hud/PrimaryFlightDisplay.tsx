import React, { useEffect, useState } from 'react';
import { useTelemetryStore, registerTelemetryListener } from '../stores/telemetryStore';
import { useFleetStore } from '../stores/fleetStore';
import { useMissionStore } from '../stores/missionStore';
import { ArtificialHorizon } from './ArtificialHorizon';
import { HeadingTape } from './HeadingTape';
import { AltitudeTape } from './AltitudeTape';
import { SpeedIndicator } from './SpeedIndicator';
import { BatteryIndicator } from './BatteryIndicator';
import { GpsIndicator } from './GpsIndicator';
import { ConnectionIndicator } from './ConnectionIndicator';
import { AlertOverlay } from './AlertOverlay';
import { TelemetryState } from '../types/telemetry';
import { ShieldCheck, ChevronDown } from 'lucide-react';

export const PrimaryFlightDisplay: React.FC = () => {
  const { activeDroneId, setActiveDroneId, getTelemetry } = useTelemetryStore();
  const { drones } = useFleetStore();
  const missionState = useMissionStore();

  // High-frequency local state decoupled from main app render tree
  const [telemetry, setTelemetry] = useState<TelemetryState>(
    getTelemetry(activeDroneId) || ({} as TelemetryState)
  );

  // Subscribe to direct telemetry updates using rAF
  useEffect(() => {
    let animFrame: number;
    let pendingTelem: TelemetryState | null = null;

    const unsubscribe = registerTelemetryListener((droneId, telem) => {
      if (droneId === activeDroneId) {
        pendingTelem = telem;
      }
    });

    const updateLoop = () => {
      if (pendingTelem) {
        setTelemetry(pendingTelem);
        pendingTelem = null;
      }
      animFrame = requestAnimationFrame(updateLoop);
    };

    animFrame = requestAnimationFrame(updateLoop);

    return () => {
      unsubscribe();
      cancelAnimationFrame(animFrame);
    };
  }, [activeDroneId]);

  if (!telemetry || !telemetry.drone_id) {
    return null;
  }

  const isCritical = telemetry.battery_percent <= 10;

  return (
    <div className="relative w-full bg-[#0B0F14]/98 border-t border-[#2B3743] backdrop-blur-md px-3 sm:px-6 py-2 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.6)] text-[#E7EBEF] select-none z-20 flex-shrink-0">
      {/* Alert Overlay Banner */}
      <AlertOverlay
        isCritical={isCritical}
        message={isCritical ? 'CRITICAL BATTERY WARNING — AUTO RTL IMMINENT' : undefined}
      />

      {/* 1. Left Cluster: Drone Selector, Speed, GPS */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Drone Selector Pill */}
        <div className="flex flex-col space-y-1 bg-[#11171E] p-1.5 rounded-lg border border-[#2B3743]">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-[#4F9A72] animate-pulse" />
            <select
              value={activeDroneId}
              onChange={(e) => setActiveDroneId(e.target.value)}
              className="bg-[#151D26] border border-[#2B3743] rounded px-2 py-0.5 text-xs font-mono font-bold text-[#E7EBEF] focus:outline-none focus:border-[#5B8FB9]"
            >
              {Object.values(drones).map((d) => (
                <option key={d.drone_id} value={d.drone_id}>
                  {d.is_leader ? '★ ' : ''}{d.callsign}
                </option>
              ))}
            </select>
          </div>
          <div className="text-[9px] font-mono text-[#707C88] px-0.5">
            PROG: <span className="text-[#5B8FB9] font-bold">{missionState.mission_progress.toFixed(0)}%</span> | WP: <span className="text-[#4F9A72] font-bold">{missionState.active_waypoint_index}</span>
          </div>
        </div>

        {/* Speed Tape */}
        <SpeedIndicator
          groundSpeed={telemetry.ground_speed || 0}
          airSpeed={telemetry.air_speed || 0}
        />

        {/* GPS Fix */}
        <GpsIndicator
          satellites={telemetry.satellites || 0}
          hdop={telemetry.hdop || 1.0}
          fixType={telemetry.gps_fix || 3}
          lat={telemetry.latitude || 0}
          lon={telemetry.longitude || 0}
        />
      </div>

      {/* Divider */}
      <div className="hidden lg:block h-16 w-px bg-gradient-to-b from-transparent via-[#2B3743] to-transparent mx-2" />

      {/* 2. Center Cluster: Artificial Horizon & Heading Tape */}
      <div className="flex flex-col items-center space-y-1">
        <HeadingTape heading={telemetry.heading || 0} />
        <ArtificialHorizon
          pitch={telemetry.pitch || 0}
          roll={telemetry.roll || 0}
        />
      </div>

      {/* Divider */}
      <div className="hidden lg:block h-16 w-px bg-gradient-to-b from-transparent via-[#2B3743] to-transparent mx-2" />

      {/* 3. Right Cluster: Altitude, Battery, Link */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Altitude & Climb Rate */}
        <AltitudeTape
          altitudeMsl={telemetry.altitude_msl || 0}
          altitudeAgl={telemetry.altitude_agl || 0}
          verticalSpeed={telemetry.vertical_speed || 0}
        />

        {/* Battery Capacity */}
        <BatteryIndicator
          batteryPercent={telemetry.battery_percent || 100}
          batteryVoltage={telemetry.battery_voltage || 25.2}
          batteryCurrent={telemetry.battery_current || 0}
        />

        {/* Link / Mode */}
        <ConnectionIndicator
          rssi={telemetry.rssi || -60}
          latencyMs={telemetry.latency_ms || 10}
          flightMode={telemetry.flight_mode || 'MANUAL'}
        />
      </div>
    </div>
  );
};
