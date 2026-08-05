import type { RFHeatmapCell } from '../types';
import { RFCoveragePredictor } from './rfCoveragePredictor';

export class CoverageHeatmapEngine {
  private static cache = new Map<string, RFHeatmapCell[]>();

  /**
   * Generate 2D RF coverage heatmap grid centered at GCS coordinates.
   */
  public static generateHeatmap(
    gcsLat: number,
    gcsLng: number,
    radiusKm: number = 2.0,
    resolution: number = 7
  ): RFHeatmapCell[] {
    const key = `${gcsLat.toFixed(3)},${gcsLng.toFixed(3)},${radiusKm},${resolution}`;
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const cells: RFHeatmapCell[] = [];
    const step = (radiusKm * 2) / (resolution * 111.32);
    const half = Math.floor(resolution / 2);

    for (let r = -half; r <= half; r++) {
      for (let c = -half; c <= half; c++) {
        const lat = gcsLat + r * step;
        const lng = gcsLng + c * step;

        const pred = RFCoveragePredictor.predictSignal(
          { lat: gcsLat, lng: gcsLng, altAGLM: 10 },
          { lat, lng, altAGLM: 80 }
        );

        cells.push({
          lat,
          lng,
          rssiDbm: pred.rssiDbm,
          qualityPercent: pred.signalQualityPercent,
          isDeadZone: pred.isDeadZone
        });
      }
    }

    this.cache.set(key, cells);
    return cells;
  }
}
