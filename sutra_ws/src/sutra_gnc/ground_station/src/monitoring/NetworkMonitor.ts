export class NetworkMonitor {
  public static getNetworkStats(): { latencyMs: number; packetLossPercent: number; wsStatus: 'CONNECTED' | 'RECONNECTING' } {
    return {
      latencyMs: 18,
      packetLossPercent: 0.1,
      wsStatus: 'CONNECTED'
    };
  }
}
