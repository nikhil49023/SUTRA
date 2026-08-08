export class SignalMonitor {
  public static evaluateSignal(rssiDbm: number): { qualityPercent: number; isHealthy: boolean } {
    const quality = Math.max(0, Math.min(100, Math.round(((rssiDbm + 100) / 50) * 100)));
    return {
      qualityPercent: quality,
      isHealthy: rssiDbm >= -90
    };
  }
}
