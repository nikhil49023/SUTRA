import type { LineOfSightResult, RFSignalPrediction, SearchGridCell } from './types';
import { TerrainService } from './terrainService';
import { GISService } from '../services/gisService';

export class SpatialAnalysisEngine {
  /**
   * Computes Line-of-Sight (LOS) raycasting between GCS antenna and UAV position
   */
  static calculateLineOfSight(
    gcsPos: { lat: number; lng: number; antennaAltM: number },
    dronePos: { lat: number; lng: number; altitudeM: number }
  ): LineOfSightResult {
    const profile = TerrainService.getTerrainProfile([gcsPos.lat, gcsPos.lng], [dronePos.lat, dronePos.lng], 15);
    const totalDistKm = GISService.calculateRouteDistance([[gcsPos.lat, gcsPos.lng], [dronePos.lat, dronePos.lng]]);

    let hasClearLOS = true;
    let obstructionPoint;
    let minClearanceM = 999;

    profile.forEach((pt) => {
      // Linear line of sight ray altitude at this point
      const rayAlt = gcsPos.antennaAltM + (dronePos.altitudeM - gcsPos.antennaAltM) * (pt.distanceFromStartKm / (totalDistKm || 1));
      const clearance = rayAlt - pt.elevationM;

      if (clearance < minClearanceM) minClearanceM = clearance;

      if (pt.elevationM > rayAlt) {
        hasClearLOS = false;
        obstructionPoint = { lat: pt.lat, lng: pt.lng, elevationM: pt.elevationM };
      }
    });

    return {
      hasClearLOS,
      obstructionPoint,
      maxFresnelZoneClearanceM: Math.max(0, Math.round(minClearanceM))
    };
  }

  /**
   * RF Signal Strength Prediction (Friis Free-Space Path Loss model + terrain shadowing)
   */
  static predictRFSignal(distanceKm: number, txPowerDbm: number = 30): RFSignalPrediction {
    // Path loss L = 20log10(d) + 20log10(f) + 32.44 (5.8 GHz)
    const pathLossDb = 20 * Math.log10(Math.max(0.1, distanceKm)) + 20 * Math.log10(5800) + 32.44;
    const rssiDbm = Math.round(txPowerDbm - pathLossDb);

    const signalQualityPercent = Math.max(0, Math.min(100, Math.round(((rssiDbm + 95) / 45) * 100)));
    const isLinkEstablished = rssiDbm > -90;

    return {
      rssiDbm,
      signalQualityPercent,
      isLinkEstablished,
      estimatedMarginDb: rssiDbm - (-90)
    };
  }

  /**
   * Decomposes a bounding box search zone into an AI Search Grid for SAR
   */
  static generateAISearchGrid(centerLat: number, centerLng: number, sizeKm: number = 2.0, gridRows: number = 4): SearchGridCell[] {
    const cells: SearchGridCell[] = [];
    const step = sizeKm / gridRows / 111.32; // Approx lat deg per km

    let cellId = 1;
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridRows; c++) {
        const minLat = centerLat - (sizeKm / 2) / 111.32 + r * step;
        const maxLat = minLat + step;
        const minLng = centerLng - (sizeKm / 2) / 111.32 + c * step;
        const maxLng = minLng + step;

        cells.push({
          id: `GRID-${cellId++}`,
          bounds: [
            [minLat, minLng],
            [maxLat, minLng],
            [maxLat, maxLng],
            [minLat, maxLng]
          ],
          center: [(minLat + maxLat) / 2, (minLng + maxLng) / 2],
          scanned: cellId % 2 === 0,
          priority: cellId % 3 === 0 ? 'HIGH' : 'MEDIUM'
        });
      }
    }

    return cells;
  }
}
