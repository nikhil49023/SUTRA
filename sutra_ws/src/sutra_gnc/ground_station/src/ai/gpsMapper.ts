import type { BoundingBox } from './types';

export class GPSMapper {
  /**
   * Projects a 2D bounding box center pixel coordinate onto 3D WGS84 GPS space
   */
  static projectPixelToGPS(
    bbox: BoundingBox,
    dronePos: { lat: number; lng: number; altitude: number },
    gimbalPitchDeg: number = -45,
    gimbalYawDeg: number = 0
  ): { lat: number; lng: number; alt: number } {
    // Center point of bounding box
    const width = bbox.width ?? bbox.w ?? 0;
    const height = bbox.height ?? bbox.h ?? 0;
    const centerX = (bbox.x + width / 2) / 100 - 0.5; // -0.5 to +0.5
    const centerY = (bbox.y + height / 2) / 100 - 0.5;

    // Approximate angular offset based on camera FOV (60 deg horizontal, 45 deg vertical)
    const offsetLng = (centerX * 60 * 0.00001);
    const offsetLat = (-centerY * 45 * 0.00001);

    const projectedLat = +(dronePos.lat + offsetLat).toFixed(4);
    const projectedLng = +(dronePos.lng + offsetLng).toFixed(4);
    const targetAlt = Math.max(0, Math.round(dronePos.altitude * Math.sin(Math.abs(gimbalPitchDeg) * (Math.PI / 180))));

    return {
      lat: projectedLat,
      lng: projectedLng,
      alt: targetAlt
    };
  }
}
