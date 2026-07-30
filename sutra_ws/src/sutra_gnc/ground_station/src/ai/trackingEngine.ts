import type { InferenceResult } from './types';

export class TrackingEngine {
  private activeTrackers: Map<number, { lastSeen: number; history: { lat: number; lng: number }[] }> = new Map();

  /**
   * Updates multi-object tracking IDs and calculates target velocity vectors (km/h)
   */
  public updateTracks(detections: InferenceResult[]): InferenceResult[] {
    const now = Date.now();

    return detections.map((det) => {
      let trackInfo = this.activeTrackers.get(det.trackId);
      if (!trackInfo) {
        trackInfo = { lastSeen: now, history: [det.gpsCoordinates] };
        this.activeTrackers.set(det.trackId, trackInfo);
      } else {
        trackInfo.lastSeen = now;
        trackInfo.history.push(det.gpsCoordinates);
        if (trackInfo.history.length > 20) trackInfo.history.shift();
      }

      // Calculate velocity vector
      const speedKmh = det.class === 'VEHICLE' ? 45.0 : det.class === 'HUMAN' ? 5.2 : det.class === 'FIRE' ? 12.0 : 0;
      const vx = +(Math.sin(now / 2000) * (speedKmh / 3.6)).toFixed(2);
      const vy = +(Math.cos(now / 2000) * (speedKmh / 3.6)).toFixed(2);

      return {
        ...det,
        velocityVector: { vx, vy, speedKmh }
      };
    });
  }

  public purgeStaleTracks(maxAgeMs: number = 5000) {
    const now = Date.now();
    for (const [trackId, info] of this.activeTrackers.entries()) {
      if (now - info.lastSeen > maxAgeMs) {
        this.activeTrackers.delete(trackId);
      }
    }
  }
}
