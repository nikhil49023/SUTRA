export interface InterpolatedState {
  lat: number;
  lng: number;
  alt: number;
  heading: number;
  roll: number;
  pitch: number;
  groundSpeed: number;
}

export class TelemetryInterpolator {
  /**
   * Interpolate between two 3D spatial points with acceleration/deceleration S-curve,
   * shortest-path yaw rotation, and physical banking roll.
   */
  public static interpolate(
    from: { lat: number; lng: number; alt: number; heading: number },
    to: { lat: number; lng: number; alt: number; heading: number },
    progress: number, // 0 to 1
    cruiseSpeedKmh: number = 40
  ): InterpolatedState {
    const clampedProgress = Math.max(0, Math.min(1, progress));

    // Smooth S-curve easing (ease-in-out cubic)
    const easedProgress =
      clampedProgress < 0.5
        ? 4 * clampedProgress * clampedProgress * clampedProgress
        : 1 - Math.pow(-2 * clampedProgress + 2, 3) / 2;

    // Linear 3D Position interpolation
    const lat = from.lat + (to.lat - from.lat) * easedProgress;
    const lng = from.lng + (to.lng - from.lng) * easedProgress;
    const alt = from.alt + (to.alt - from.alt) * easedProgress;

    // Shortest angular path yaw interpolation
    const heading = this.interpolateAngle(from.heading, to.heading, easedProgress);

    // Dynamic pitch and banking roll computation
    const headingDelta = this.shortestAngleDelta(from.heading, to.heading);
    const turnRate = headingDelta * (1 - Math.abs(clampedProgress - 0.5) * 2);
    const roll = Math.max(-25, Math.min(25, turnRate * 0.4)); // Banking roll proportional to turn rate
    const pitch = clampedProgress > 0.05 && clampedProgress < 0.95 ? -3.5 : 0; // Forward pitch during motion

    const speedRatio = Math.sin(clampedProgress * Math.PI); // Speed curve: accel -> cruise -> decel
    const groundSpeed = Math.round(cruiseSpeedKmh * speedRatio * 10) / 10;

    return {
      lat,
      lng,
      alt: Math.round(alt * 10) / 10,
      heading: Math.round(heading * 10) / 10,
      roll: Math.round(roll * 10) / 10,
      pitch: Math.round(pitch * 10) / 10,
      groundSpeed
    };
  }

  public static interpolateAngle(fromDeg: number, toDeg: number, t: number): number {
    const delta = this.shortestAngleDelta(fromDeg, toDeg);
    const result = (fromDeg + delta * t + 360) % 360;
    return result;
  }

  public static shortestAngleDelta(fromDeg: number, toDeg: number): number {
    let diff = (toDeg - fromDeg + 180) % 360 - 180;
    return diff < -180 ? diff + 360 : diff;
  }
}
