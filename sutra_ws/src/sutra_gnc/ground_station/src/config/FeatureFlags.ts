export class FeatureFlags {
  private static flags: Record<string, boolean> = {
    ENABLE_AI_RECOMMENDATIONS: true,
    ENABLE_SWARM_COORDINATION: true,
    ENABLE_RTSP_VIDEO_FEED: true,
    ENABLE_3D_DEM_TERRAIN: true,
    ENABLE_GEOFENCE_SAFETY: true
  };

  public static isEnabled(flagName: string): boolean {
    return !!this.flags[flagName];
  }
}
