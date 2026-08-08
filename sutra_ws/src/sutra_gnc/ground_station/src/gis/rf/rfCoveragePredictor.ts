import type { RFSignalPrediction } from '../types';
import { LineOfSightEngine } from '../los/lineOfSightEngine';
import { DEMEngine } from '../terrain/demEngine';

export class RFCoveragePredictor {
  /**
   * Predict RF signal strength (RSSI dBm), link quality, and dead zone status.
   */
  public static predictSignal(
    gcsPos: { lat: number; lng: number; altAGLM?: number },
    dronePos: { lat: number; lng: number; altAGLM?: number },
    txPowerDbm: number = 30, // 1W RF TX Power
    freqGHz: number = 2.4
  ): RFSignalPrediction {
    const gcsAltAGL = gcsPos.altAGLM || 10;
    const droneAltAGL = dronePos.altAGLM || 100;

    const gcsAltMSL = DEMEngine.getElevation(gcsPos.lat, gcsPos.lng) + gcsAltAGL;
    const droneAltMSL = DEMEngine.getElevation(dronePos.lat, dronePos.lng) + droneAltAGL;

    const los = LineOfSightEngine.calculateLOS(
      { lat: gcsPos.lat, lng: gcsPos.lng, altMSLM: gcsAltMSL },
      { lat: dronePos.lat, lng: dronePos.lng, altMSLM: droneAltMSL },
      15
    );

    const distKm = Math.max(los.distanceKm, 0.05);

    // Free Space Path Loss (FSPL) in dB: FSPL = 20*log10(d_km) + 20*log10(f_GHz) + 92.45
    const fsplDb = 20 * Math.log10(distKm) + 20 * Math.log10(freqGHz) + 92.45;

    // Obstruction / Non-Line-Of-Sight (NLOS) penalty attenuation
    const nlosAttenDb = los.hasClearLOS ? 0 : 25;

    const rssiDbm = txPowerDbm - fsplDb - nlosAttenDb;
    const clampedRssi = Math.max(-110, Math.min(-30, Math.round(rssiDbm)));

    // Link Quality percentage mapping (-100 dBm = 0%, -50 dBm = 100%)
    const qualityPercent = Math.max(0, Math.min(100, Math.round(((clampedRssi + 100) / 50) * 100)));

    const marginDb = clampedRssi - (-90); // Receiver sensitivity at -90 dBm
    const isDeadZone = clampedRssi < -92 || !los.hasClearLOS;

    return {
      rssiDbm: clampedRssi,
      signalQualityPercent: qualityPercent,
      isLinkEstablished: clampedRssi >= -90,
      estimatedMarginDb: Math.round(marginDb * 10) / 10,
      isDeadZone
    };
  }
}
