import { DEMEngine } from './demEngine';

export interface SlopeGridCell {
  lat: number;
  lng: number;
  slopeDegrees: number;
  aspectDegrees: number;
  isSteepCliff: boolean;
}

export class SlopeAnalyzer {
  /**
   * Compute slope and aspect for a geographic grid.
   */
  public static computeGrid(
    centerLat: number,
    centerLng: number,
    gridSize: number = 5,
    stepDegrees: number = 0.002
  ): SlopeGridCell[] {
    const cells: SlopeGridCell[] = [];
    const half = Math.floor(gridSize / 2);

    for (let r = -half; r <= half; r++) {
      for (let c = -half; c <= half; c++) {
        const lat = centerLat + r * stepDegrees;
        const lng = centerLng + c * stepDegrees;

        const elevC = DEMEngine.getElevation(lat, lng);
        const elevN = DEMEngine.getElevation(lat + stepDegrees, lng);
        const elevS = DEMEngine.getElevation(lat - stepDegrees, lng);
        const elevE = DEMEngine.getElevation(lat, lng + stepDegrees);
        const elevW = DEMEngine.getElevation(lat, lng - stepDegrees);

        const dx = (elevE - elevW) / (stepDegrees * 111320 * 2);
        const dy = (elevN - elevS) / (stepDegrees * 111320 * 2);

        const slopeRad = Math.atan(Math.sqrt(dx * dx + dy * dy));
        const slopeDeg = Math.round((slopeRad * (180 / Math.PI)) * 10) / 10;

        let aspectDeg = Math.round((Math.atan2(dy, -dx) * (180 / Math.PI) + 360) % 360);

        cells.push({
          lat,
          lng,
          slopeDegrees: slopeDeg,
          aspectDegrees: aspectDeg,
          isSteepCliff: slopeDeg >= 30
        });
      }
    }

    return cells;
  }
}
