export interface ConnectionMetricsData {
  rttMs: number;
  latencyMs: number;
  packetLossPercent: number;
  reconnectCount: number;
  bandwidthKbps: number;
  messageRateHz: number;
  droppedFrames: number;
}

export class ConnectionMetrics {
  private rttMs: number = 15;
  private latencyMs: number = 8;
  private packetLossPercent: number = 0.0;
  private reconnectCount: number = 0;
  private bytesReceived: number = 0;
  private messagesReceived: number = 0;
  private droppedFrames: number = 0;

  public updateLatency(rtt: number): void {
    this.rttMs = rtt;
    this.latencyMs = Math.round(rtt / 2);
  }

  public recordPacket(bytes: number): void {
    this.bytesReceived += bytes;
    this.messagesReceived += 1;
  }

  public incrementReconnect(): void {
    this.reconnectCount += 1;
  }

  public incrementDropped(): void {
    this.droppedFrames += 1;
  }

  public getMetrics(): ConnectionMetricsData {
    return {
      rttMs: this.rttMs,
      latencyMs: this.latencyMs,
      packetLossPercent: this.packetLossPercent,
      reconnectCount: this.reconnectCount,
      bandwidthKbps: +((this.bytesReceived * 8) / 1024 / 10).toFixed(1),
      messageRateHz: this.messagesReceived,
      droppedFrames: this.droppedFrames
    };
  }
}
