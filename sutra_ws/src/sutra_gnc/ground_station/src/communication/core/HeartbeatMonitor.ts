export class HeartbeatMonitor {
  private pingIntervalMs: number = 2000;
  private timeoutMs: number = 6000;
  private lastPingTime: number = 0;
  private lastPongTime: number = Date.now();
  private timer: number | null = null;
  private onPingSend: () => void;
  private onTimeout: () => void;
  private rtt: number = 0;

  constructor(onPingSend: () => void, onTimeout: () => void) {
    this.onPingSend = onPingSend;
    this.onTimeout = onTimeout;
  }

  public start(): void {
    this.stop();
    this.lastPongTime = Date.now();

    this.timer = window.setInterval(() => {
      const now = Date.now();
      if (now - this.lastPongTime > this.timeoutMs) {
        console.warn('[HeartbeatMonitor] Heartbeat timeout exceeded!');
        this.onTimeout();
        return;
      }

      this.lastPingTime = now;
      this.onPingSend();
    }, this.pingIntervalMs);
  }

  public registerPong(): number {
    const now = Date.now();
    this.rtt = now - this.lastPingTime;
    this.lastPongTime = now;
    return this.rtt;
  }

  public stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public getRTT(): number {
    return this.rtt;
  }
}
