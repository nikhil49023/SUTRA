import React from 'react';
import { ArtificialHorizon } from './ArtificialHorizon';
import { PitchLadder } from './PitchLadder';
import { CompassRibbon } from './CompassRibbon';
import { AirspeedIndicator } from './AirspeedIndicator';
import { Altimeter } from './Altimeter';
import { BatteryGauge } from './BatteryGauge';
import { CameraHUD } from './CameraHUD';
import { useTelemetryStore } from '../../services/telemetryStore';
import { useHUDStore } from '../../state/HUDStore';
import type { TelemetryData } from '../../types';

interface PrimaryFlightDisplayProps {
  telemetry?: TelemetryData;
}

export const PrimaryFlightDisplay: React.FC<PrimaryFlightDisplayProps> = ({ telemetry: propTelemetry }) => {
  const { currentTelemetry } = useTelemetryStore();
  const { config } = useHUDStore();

  const telemetry: TelemetryData = propTelemetry || {
    pitch: currentTelemetry?.pitch || 2.5,
    roll: currentTelemetry?.roll || -1.2,
    yaw: currentTelemetry?.yaw || 45,
    altitudeAGL: currentTelemetry?.altitudeAGL || 120,
    altitudeMSL: currentTelemetry?.altitudeMSL || 470,
    groundSpeed: currentTelemetry?.groundSpeed || 42,
    airSpeed: currentTelemetry?.airSpeed || 45,
    climbRate: currentTelemetry?.climbRate || 0.5,
    batteryVoltage: currentTelemetry?.batteryVoltage || 22.4,
    batteryCurrent: currentTelemetry?.batteryCurrent || 14.8,
    batteryRemaining: currentTelemetry?.batteryRemaining || 92,
    cellVoltages: [3.7, 3.7, 3.7, 3.7, 3.7, 3.7],
    motorRPM: [5400, 5400, 5400, 5400],
    temperatureAvionics: 38,
    temperatureESC: 42,
    satellites: currentTelemetry?.satellites || 18,
    linkLatencyMs: currentTelemetry?.linkLatencyMs || 15
  };

  return (
    <div className="relative w-full h-full bg-[#03060d] text-slate-100 font-mono overflow-hidden flex flex-col justify-between select-none">
      {/* 1. TOP COMPASS TAPE BAR */}
      {config.showCompassRibbon && <CompassRibbon heading={telemetry.yaw} />}

      {/* 2. MAIN CENTER INSTRUMENT HUD CONTAINER */}
      <div className="relative flex-1 flex items-center justify-between p-3 overflow-hidden">
        {/* LEFT FLIGHT TAPES (AIRSPEED) */}
        {config.showAirspeedTape && (
          <div className="z-30">
            <AirspeedIndicator airSpeed={telemetry.airSpeed} groundSpeed={telemetry.groundSpeed} />
          </div>
        )}

        {/* CENTER ARTIFICIAL HORIZON & PITCH LADDER */}
        <div className="relative flex-1 h-full mx-3 rounded-xl border border-[#1b253b] overflow-hidden">
          <ArtificialHorizon pitch={telemetry.pitch} roll={telemetry.roll} />
          {config.showPitchLadder && <PitchLadder pitch={telemetry.pitch} />}
        </div>

        {/* RIGHT FLIGHT TAPES (ALTIMETER & BATTERY) */}
        <div className="z-30 space-y-3">
          {config.showAltimeterTape && (
            <Altimeter
              altitudeAGL={telemetry.altitudeAGL}
              altitudeMSL={telemetry.altitudeMSL}
              climbRate={telemetry.climbRate}
            />
          )}
          <BatteryGauge
            remainingPercent={telemetry.batteryRemaining}
            voltage={telemetry.batteryVoltage}
            current={telemetry.batteryCurrent}
          />
        </div>
      </div>

      {/* 3. OPTIONAL CAMERA OVERLAY PANEL */}
      {config.showCameraHUD && (
        <div className="absolute inset-0 z-40 bg-[#03060d]">
          <CameraHUD />
        </div>
      )}
    </div>
  );
};
