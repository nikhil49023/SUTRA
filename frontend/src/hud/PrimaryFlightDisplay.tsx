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
import { ShieldCheck, ChevronDown, Star } from 'lucide-react';

export const PrimaryFlightDisplay: React.FC = () => {
  const { activeDroneId, setActiveDroneId, getTelemetry } = useTelemetryStore();
  const { drones, leader_id, setLeader } = useFleetStore();
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
  const isLeader = activeDroneId === leader_id;

  return (
    <div className="relative w-full bg-[#0B0F14]/98 border-t border-[#2B3743] backdrop-blur-md px-3 sm:px-6 py-2 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.6)] text-[#E7EBEF] select-none z-20 flex-shrink-0">
      {/* Alert Overlay Banner */}
      <AlertOverlay
        isCritical={isCritical}
        message={isCritical ? 'CRITICAL BATTERY WARNING — AUTO RTL IMMINENT' : undefined}
      />

      {/* 1. Left Cluster: Drone Selector, Multi-UAV Quick Switcher, Speed, GPS */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Drone Selector Pill & Quick Swarm Switcher */}
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
                  {d.drone_id === leader_id || d.is_leader ? '★ ' : ''}{d.callsign}
                </option>
              ))}
            </select>
            {!isLeader && (
              <button
                onClick={() => setLeader(activeDroneId)}
                title="Promote selected UAV to Swarm Leader"
                className="px-1.5 py-0.5 rounded bg-[#151D26] hover:bg-[#C49A4A] hover:text-[#0B0F14] border border-[#C49A4A]/60 text-[#C49A4A] text-[10px] font-bold transition flex items-center space-x-0.5 active:scale-95"
              >
                <Star className="w-2.5 h-2.5 fill-current" />
                <span>LEAD</span>
              </button>
            )}
          </div>
          {/* Multi-Drone Mini Pill Bar */}
          <div className="flex items-center space-x-1 pt-0.5">
            {Object.values(drones).map((d) => {
              const isCurrent = d.drone_id === activeDroneId;
              const isLead = d.drone_id === leader_id || d.is_leader;
              return (
                <button
                  key={d.drone_id}
                  onClick={() => setActiveDroneId(d.drone_id)}
                  className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold transition flex items-center space-x-1 border ${
                    isCurrent
                      ? 'bg-[#1B2530] border-[#5B8FB9] text-[#E7EBEF] shadow-[0_0_6px_rgba(91,143,185,0.4)]'
                      : 'bg-[#151D26] border-[#2B3743] text-[#707C88] hover:text-[#E7EBEF] hover:border-[#3A4856]'
                  }`}
                  title={`${d.callsign} (${d.battery.toFixed(0)}% · ${d.altitude.toFixed(0)}m)`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isLead ? 'bg-[#C49A4A]' : 'bg-[#4F9A72]'}`} />
                  <span>{d.callsign.split(' ')[0]}</span>
                </button>
              );
            })}
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
