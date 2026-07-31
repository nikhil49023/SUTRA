import type { TelemetryData } from '../types';

export class TelemetryThrottler {
  private packetBuffer: TelemetryData[] = [];
  private lastRenderTimeMs: number = 0;
  private renderIntervalMs: number = 50; // 20 Hz UI refresh rate
  private subscriber: ((data: TelemetryData) => void) | null = null;

  public pushPacket(packet: TelemetryData): void {
    this.packetBuffer.push(packet);
    if (this.packetBuffer.length > 200) {
      this.packetBuffer.shift(); // Keep latest 200 packets in memory
    }

    const now = performance.now();
    if (now - this.lastRenderTimeMs >= this.renderIntervalMs) {
      this.lastRenderTimeMs = now;
      if (this.subscriber) {
        this.subscriber(packet);
      }
    }
  }

  public setSubscriber(fn: (data: TelemetryData) => void): void {
    this.subscriber = fn;
  }

  public getRawBuffer(): TelemetryData[] {
    return [...this.packetBuffer];
  }
}
